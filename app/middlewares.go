package app

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	app_ctx "github.com/thevtm/baker-news/app/context"
	signin "github.com/thevtm/baker-news/app/sign-in"
)

////////////////////////////////////////
// Request ID Middleware
////////////////////////////////////////

const ContextKeyRequestId app_ctx.ContextKey = "request_id"

type RequestIDMiddleware struct {
	Handler        http.Handler
	request_id_inc *int
}

func NewRequestIDMiddleware(handler http.Handler, request_id_inc *int) *RequestIDMiddleware {
	return &RequestIDMiddleware{
		Handler:        handler,
		request_id_inc: request_id_inc,
	}
}

func (m *RequestIDMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx = context.WithValue(ctx, ContextKeyRequestId, m.request_id_inc)
	*m.request_id_inc += 1

	m.Handler.ServeHTTP(w, r.WithContext(ctx))
}

////////////////////////////////////////
// Logging Middleware
////////////////////////////////////////

type LoggingMiddleware struct {
	Handler http.Handler
}

func NewLoggingMiddleware(handler http.Handler) *LoggingMiddleware {
	return &LoggingMiddleware{Handler: handler}
}

func (m *LoggingMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Auth Context
	auth_ctx := signin.GetAuthContext(r.Context())
	auth_attrs := []any{
		slog.Int64("user_id", auth_ctx.User.ID),
		slog.String("user_role", string(auth_ctx.User.Role)),
	}

	// Request
	header_attrs := make([]any, 0, len(r.Header))
	for key, values := range r.Header {
		header_attrs = append(header_attrs, slog.String(key, strings.Join(values, ",")))
	}

	request_attrs := []any{
		slog.String("proto", r.Proto),
		slog.String("method", r.Method),
		slog.String("url", r.URL.Path),
		slog.Group("header", header_attrs...),
	}

	// Log
	slog.InfoContext(r.Context(), "Request received",
		slog.Group("auth", auth_attrs...),
		slog.Group("request", request_attrs...),
	)

	m.Handler.ServeHTTP(w, r)

	slog.InfoContext(r.Context(), "Request completed")
}
