package web_console

import (
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
)

type WebConsolePageHandler struct {
	Queries *state.Queries
}

func NewWebConsolePageHandler(queries *state.Queries) *WebConsolePageHandler {
	return &WebConsolePageHandler{Queries: queries}
}

func (p *WebConsolePageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	user := auth.GetAuthContext(ctx).User

	// 1. Redirect to sign in if user is guest
	if !user.IsAdmin() {
		slog.InfoContext(ctx, "User is not an admin")
		htmx.HTMXLocation(w, "/sign-in", "main")
		return
	}

	// 2. Render the page
	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		WebConsoleMain().Render(r.Context(), w)
		return
	}

	WebConsolePage(&user).Render(r.Context(), w)
}
