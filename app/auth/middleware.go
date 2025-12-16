package auth

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	app_ctx "github.com/thevtm/baker-news/app/context"
	"github.com/thevtm/baker-news/state"
)

////////////////////////////////////////
// Auth Context
////////////////////////////////////////

const AuthContextKeyUser app_ctx.ContextKey = "user"

type AuthContext struct {
	User state.User
}

func NewAuthContext(user state.User) AuthContext {
	return AuthContext{
		User: user,
	}
}

func GetAuthContext(ctx context.Context) AuthContext {
	return AuthContext{
		User: ctx.Value(AuthContextKeyUser).(state.User),
	}
}

func SetAuthContext(ctx context.Context, auth_ctx AuthContext) context.Context {
	return context.WithValue(ctx, AuthContextKeyUser, auth_ctx.User)
}

////////////////////////////////////////
// Auth Middleware
////////////////////////////////////////

type AuthMiddlewareHandler struct {
	Handler http.Handler
	Queries *state.Queries
}

func NewAuthMiddlewareHandler(handler http.Handler, queries *state.Queries) *AuthMiddlewareHandler {
	return &AuthMiddlewareHandler{Handler: handler, Queries: queries}
}

func (m *AuthMiddlewareHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	user_cookie, ok, err := ParseAuthCookie(r)

	// 1. Error parsing cookie, set user as guest
	if err != nil {
		err = fmt.Errorf("failed to parse user cookie: %w", err)

		slog.WarnContext(r.Context(), "AuthMiddlewareHandler failed, setting user as guest",
			slog.Any("error", err),
		)

		SetAuthCookie(w, &GuestCookie)
		ctx = SetAuthContext(ctx, AuthContext{User: state.UserGuest})
		m.Handler.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// 2. User cookie not present, set user as guest
	if !ok {
		ctx = SetAuthContext(ctx, AuthContext{User: state.UserGuest})
		m.Handler.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// 3. User cookie present, query user
	user, err := m.Queries.GetUserByID(r.Context(), user_cookie.UserID)

	if err == nil {
		ctx = SetAuthContext(ctx, AuthContext{User: user})
		m.Handler.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// 4. Error querying user, set user as guest
	err = fmt.Errorf("failed to query user: %w", err)
	slog.WarnContext(r.Context(), "AuthMiddlewareHandler failed, setting user as guest",
		slog.Any("error", err),
	)

	SetAuthCookie(w, &GuestCookie)
	ctx = SetAuthContext(ctx, AuthContext{User: state.UserGuest})
	m.Handler.ServeHTTP(w, r.WithContext(ctx))
}
