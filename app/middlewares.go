package app

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/negrel/assert"
	app_ctx "github.com/thevtm/baker-news/app/context"
	"github.com/thevtm/baker-news/state"
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
	header_attrs := make([]any, 0)
	for key, values := range r.Header {
		header_attrs = append(header_attrs, slog.String(key, strings.Join(values, ",")))
	}

	slog.InfoContext(r.Context(), "Request received",
		slog.String("method", r.Method),
		slog.String("url", r.URL.Path),
		slog.Group("header", header_attrs...))

	m.Handler.ServeHTTP(w, r)

	slog.InfoContext(r.Context(), "Request completed")
}

type LoggingMiddlewareContextHandler struct {
	slog.Handler
}

func (h *LoggingMiddlewareContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if request_id, ok := ctx.Value(ContextKeyRequestId).(int); ok {
		r.AddAttrs(slog.Int(string(ContextKeyRequestId), request_id))
	}

	return h.Handler.Handle(ctx, r)
}

////////////////////////////////////////
// Auth Middleware
////////////////////////////////////////

const ContextKeyUserID app_ctx.ContextKey = "user_id"
const ContextKeyUserRole app_ctx.ContextKey = "user_role"

const AuthUserIDCookieName = "baker-news_user-id"
const AuthUserRoleCookieName = "baker-news_user-role"

type AuthMiddlewareHandler struct {
	Handler http.Handler
}

func SetGuestUserContext(ctx context.Context, w http.ResponseWriter) context.Context {
	ctx = context.WithValue(ctx, ContextKeyUserID, state.GuestID)

	http.SetCookie(w, &http.Cookie{
		Name:     AuthUserIDCookieName,
		Value:    state.GuestIDStr,
		Expires:  time.Now().Add(30 * 24 * time.Hour),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})

	ctx = context.WithValue(ctx, ContextKeyUserRole, state.UserRoleGuest)

	http.SetCookie(w, &http.Cookie{
		Name:     AuthUserRoleCookieName,
		Value:    string(state.UserRoleGuest),
		Expires:  time.Now().Add(30 * 24 * time.Hour),
		Secure:   false,
		HttpOnly: true,
		Path:     "/",
	})

	return ctx
}

func NewAuthMiddlewareHandler(handler http.Handler) *AuthMiddlewareHandler {
	return &AuthMiddlewareHandler{Handler: handler}
}

func (m *AuthMiddlewareHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Check if User cookie is present
	user_id_cookie := r.CookiesNamed(AuthUserIDCookieName)
	user_id_cookie_present := len(user_id_cookie) > 0
	assert.LessOrEqual(user_id_cookie, 1, "user_id_cookie must be present at most once")

	// 2. If User cookie is not present, set user as Guest
	if !user_id_cookie_present {
		slog.DebugContext(r.Context(), "User cookie not found, setting to Guest")
		ctx = SetGuestUserContext(ctx, w)
		m.Handler.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// 3. Parse cookie values
	user_id_cookie_value := user_id_cookie[0].Value
	user_id, err := strconv.ParseInt(user_id_cookie_value, 10, 64)
	user_role_cookie := r.CookiesNamed(AuthUserRoleCookieName)
	user_role_cookie_value := user_role_cookie[0].Value

	// 4. If parsing fails, set user as Guest
	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to parse user_id cookie, setting user as Guest",
			slog.String("user_id_cookie_value", user_id_cookie_value), slog.Any("error", err))
		ctx = SetGuestUserContext(ctx, w)
		m.Handler.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// 5. Set user_id and user_role in context
	slog.DebugContext(r.Context(), "User cookie found",
		slog.String("user_id", user_id_cookie_value),
		slog.String("user_role", user_role_cookie_value))

	ctx = context.WithValue(ctx, ContextKeyUserID, user_id)
	ctx = context.WithValue(ctx, ContextKeyUserRole, state.UserRole(user_role_cookie_value))

	m.Handler.ServeHTTP(w, r.WithContext(ctx))
}
