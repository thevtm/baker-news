package signin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type UserSignInSubmitHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewUserSignInSubmitHandler(queries *state.Queries, commands *commands.Commands) *UserSignInSubmitHandler {
	return &UserSignInSubmitHandler{Queries: queries, Commands: commands}
}

func handle_error(ctx context.Context, w http.ResponseWriter, err error) {
	SetGuestUserCookie(w)

	var validation_err *commands.ErrCommandValidationFailed
	if errors.As(err, &validation_err) {
		SignInPage(validation_err.Error()).Render(ctx, w)
		return
	}

	slog.ErrorContext(ctx, "UserSignInSubmitHandler failed", slog.Any("error", err))
	SignInPage("An error occurred").Render(ctx, w)
}

func (h *UserSignInSubmitHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	Commands := h.Commands
	ctx := r.Context()

	// 1. Parse form values
	username_form_value := r.FormValue("username")
	password_form_value := r.FormValue("password")

	slog.DebugContext(r.Context(), "Login form submitted",
		slog.String("username_form_value", username_form_value),
		slog.String("password_form_value", password_form_value),
	)

	// 2. Try to sign in the user
	user, ok, err := Commands.UserSignIn(r.Context(), username_form_value)

	if err != nil {
		err = fmt.Errorf("failed to sign in user: %w", err)
		handle_error(ctx, w, err)
		return
	}

	if ok {
		user_cookie := NewUserCookie(user.ID, user.Role)
		SetUserCookie(w, &user_cookie)

		slog.InfoContext(r.Context(), "User signed in", slog.Any("user_id", user.ID))

		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 3. User not found, create a new user
	user, err = Commands.UserSignUp(r.Context(), username_form_value)

	if err != nil {
		err = fmt.Errorf("failed to sign up user: %w", err)
		handle_error(ctx, w, err)
		return
	}

	user_cookie := NewUserCookie(user.ID, user.Role)
	SetUserCookie(w, &user_cookie)

	slog.InfoContext(r.Context(), "User not found, created new user",
		slog.Int64("user_id", user.ID),
	)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}