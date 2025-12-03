package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/a-h/templ"
	dapr "github.com/dapr/go-sdk/client"
	"github.com/thevtm/baker-news/models"
	"github.com/thevtm/baker-news/ui/post_page"
	"github.com/thevtm/baker-news/ui/posts_page"
	"github.com/thevtm/baker-news/ui/ui_gallery_page"
)

const PORT = 8080

type ContextKey string

const ContextKeyRequestId ContextKey = "request_id"

var request_id_inc = 0

type ContextHandler struct {
	slog.Handler
}

func (h *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
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
	client, err := dapr.NewClient()
	if err != nil {
		panic(err)
	}
	slog.Info("Dapr client initialized")
	// defer client.Close()
	// TODO: use the client here, see below for examples

	data := []byte(`{ "id": "a123", "value": "abcdefg", "valid": true, "count": 42 }`)
	if err := client.PublishEvent(context.Background(), "pubsub", "topisc-name", data); err != nil {
		panic(err)
	}

	// save state with the key key1, default options: strong, last-write
	if err := client.SaveState(context.Background(), "state-store", "key1", []byte("hello"), nil); err != nil {
		panic(err)
	}

	config, err := client.GetConfigurationItem(context.Background(), "config-store", "config-item-1")
	if err != nil {
		panic(err)
	}
	if config == nil {
		panic("Configuration item not found")
	}
	slog.Info("Configuration item retrieved", slog.String("config-item-1", config.Value))

	client.SubscribeConfigurationItems(context.Background(), "config-store", []string{"config-item-2", "config-item-3"},
		func(id string, config map[string]*dapr.ConfigurationItem) {
			for k, v := range config {
				slog.Info("Configuration updated", slog.String("id", id), slog.String("key", k), slog.String("value", v.Value))
			}
			// First invocation when app subscribes to config changes only returns subscription id
		})

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
	posts := []models.Post{
		{Title: "My First Post", URL: "/post/1", Score: 10},
		{Title: "My Second Post", URL: "/post/2", Score: 20},
		{Title: "My Third Post", URL: "/post/3", Score: 30},
	}

	// Required due to `x/net/trace: registered routes conflict with "GET /"`
	// See https://github.com/golang/go/issues/69951
	mux := http.NewServeMux()

	mux.HandleFunc("GET /", RequestIdMiddleware(LoggingMiddleware(func(w http.ResponseWriter, r *http.Request) {
		is_htmx_request := r.Header.Get("HX-Request") == "true"
		htmx_target := r.Header.Get("HX-Target")

		if is_htmx_request && htmx_target == "main" {
			posts_page.PostsMain(posts).Render(r.Context(), w)
			return
		}

		posts_page.PostsPage(posts).Render(r.Context(), w)
	})))

	mux.HandleFunc("GET /post/{post_id}", RequestIdMiddleware(LoggingMiddleware(func(w http.ResponseWriter, r *http.Request) {
		is_htmx_request := r.Header.Get("HX-Request") == "true"
		htmx_target := r.Header.Get("HX-Target")

		if is_htmx_request && htmx_target == "main" {
			post_page.PostMain(posts[0]).Render(r.Context(), w)
			return
		}

		post_page.PostPage(posts[0]).Render(r.Context(), w)
	})))

	// index_page_component := posts_page.PostsPage(posts)
	// mux.Handle("GET /", templ.Handler(index_page_component))

	// post_page_component := post_page.PostPage(posts[0])
	// mux.Handle("GET /posts/:post_id", templ.Handler(post_page_component))

	ui_gallery_page_component := ui_gallery_page.UiGalleryPage()
	mux.Handle("GET /ui-gallery", templ.Handler(ui_gallery_page_component))

	slog.Info("Server started!", "PORT", PORT)
	err := http.ListenAndServe(fmt.Sprintf(":%d", PORT), mux)
	if err != nil {
		slog.Error("Server error", "error", err)
	}
}
