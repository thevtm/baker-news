package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"strings"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/jackc/pgx/v5"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/app"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/events"
	"github.com/thevtm/baker-news/state"
	"github.com/thevtm/baker-news/worker"
)

type ContextKey string

const ContextKeyRequestId ContextKey = "request_id"

var request_id_inc = 0

var wd string
var wd_len int

func init() {
	currentDir := lo.Must(os.Getwd())
	wd = currentDir
	wd_len = len(wd)
}

type ContextHandler struct {
	slog.Handler
}

func (h *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	// Add the caller path:line to the log record
	if _, filename, line, ok := runtime.Caller(3); ok {
		r.AddAttrs(slog.String("source", fmt.Sprintf("%s:%d", filename[wd_len:], line)))
	}

	// Add the request_id to the log record
	if request_id, ok := ctx.Value(ContextKeyRequestId).(int); ok {
		r.AddAttrs(slog.Int(string(ContextKeyRequestId), request_id))
	}

	return h.Handler.Handle(ctx, r)
}

const DEFAULT_LOG_LEVEL = slog.LevelInfo

func ParseLogLevel(log_level string) (slog.Level, bool) {
	log_level = strings.ToUpper(log_level)

	switch log_level {
	case "DEBUG":
		return slog.LevelDebug, true
	case "INFO":
		return slog.LevelInfo, true
	case "WARN":
		return slog.LevelWarn, true
	case "ERROR":
		return slog.LevelError, true
	}

	return -1, false
}

func SlogLevelToString(level slog.Level) string {
	switch level {
	case slog.LevelDebug:
		return "DEBUG"
	case slog.LevelInfo:
		return "INFO"
	case slog.LevelWarn:
		return "WARN"
	case slog.LevelError:
		return "ERROR"
	}

	panic(fmt.Sprintf("Invalid log level: %d", level))
}

func init() {
	// 1. Initialize the logger
	log_level := DEFAULT_LOG_LEVEL

	if log_level_env, ok := os.LookupEnv("LOG_LEVEL"); ok {
		parsed_log_level, ok := ParseLogLevel(log_level_env)

		if !ok {
			panic(fmt.Sprintf("Invalid log level provided: \"%s\"", log_level_env))
		}

		log_level = parsed_log_level
	}

	json_log_handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: log_level})
	context_log_handler := &ContextHandler{Handler: json_log_handler}
	logger := slog.New(context_log_handler)

	slog.SetDefault(logger)

	slog.Info("Logger initialized", slog.String("log_level", SlogLevelToString(log_level)))

	// 2. Initialize the Dapr client
	// client, err := dapr.NewClient()
	// if err != nil {
	// 	panic(err)
	// }
	// slog.Info("Dapr client initialized")
	// // defer client.Close()
	// // TODO: use the client here, see below for examples

	// data := []byte(`{ "id": "a123", "value": "abcdefg", "valid": true, "count": 42 }`)
	// if err := client.PublishEvent(context.Background(), "pubsub", "topisc-name", data); err != nil {
	// 	panic(err)
	// }

	// // save state with the key key1, default options: strong, last-write
	// if err := client.SaveState(context.Background(), "state-store", "key1", []byte("hello"), nil); err != nil {
	// 	panic(err)
	// }

	// config, err := client.GetConfigurationItem(context.Background(), "config-store", "config-item-1")
	// if err != nil {
	// 	panic(err)
	// }
	// if config == nil {
	// 	panic("Configuration item not found")
	// }
	// slog.Info("Configuration item retrieved", slog.String("config-item-1", config.Value))

	// client.SubscribeConfigurationItems(context.Background(), "config-store", []string{"config-item-2", "config-item-3"},
	// 	func(id string, config map[string]*dapr.ConfigurationItem) {
	// 		for k, v := range config {
	// 			slog.Info("Configuration updated", slog.String("id", id), slog.String("key", k), slog.String("value", v.Value))
	// 		}
	// 		// First invocation when app subscribes to config changes only returns subscription id
	// 	})
}

func RequestIdMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		ctx = context.WithValue(ctx, ContextKeyRequestId, request_id_inc)
		request_id_inc += 1

		handler(w, req.WithContext(ctx))
	})
}

func LoggingMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		header_attrs := make([]any, 0)
		for key, values := range req.Header {
			header_attrs = append(header_attrs, slog.String(key, strings.Join(values, ",")))
		}

		slog.InfoContext(req.Context(), "Request received",
			slog.String("method", req.Method),
			slog.String("url", req.URL.Path),
			slog.Group("header", header_attrs...))

		handler(w, req)

		slog.InfoContext(req.Context(), "Request completed")
	})
}

func main() {
	// 1. Set up the database connection
	db_uri, command_nil_found := os.LookupEnv("DATABASE_URI")
	if !command_nil_found {
		panic("DATABASE_URI env var is not set")
	}
	ctx := context.Background()
	conn := lo.Must1(pgx.Connect(ctx, db_uri))
	defer conn.Close(ctx)

	// 2. Set up the Dapr dapr_client
	dapr_client, err := dapr.NewClient()

	if err != nil {
		panic(err)
	}

	defer dapr_client.Close()
	slog.Info("Dapr client initialized")

	// 3. Set up app
	queries := state.New(conn)
	events := events.New(dapr_client, "pubsub")
	commands := commands.New(queries, events)

	app := app.New(queries, commands, events)

	// 4. Worker
	worker := worker.New(dapr_client, "pubsub")
	worker.Start()

	defer worker.Stop()

	// 4. Set up and start the server
	const PORT = 8080
	mux := app.MakeServer()

	slog.Info("Server started!", "PORT", PORT)

	address := fmt.Sprintf(":%d", PORT)
	err = http.ListenAndServe(address, mux)
	if err != nil {
		slog.Error("Server error", "error", err)
	}
}
