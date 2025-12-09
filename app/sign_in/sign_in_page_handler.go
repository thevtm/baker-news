package sign_in

import (
	"net/http"
	"net/url"

	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
)

type UserSignInPageHandler struct {
	queries *state.Queries
}

func NewUserSignInHandler(queries *state.Queries) *UserSignInPageHandler {
	return &UserSignInPageHandler{queries: queries}
}

func (h *UserSignInPageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user := GetAuthContext(r.Context()).User

	// 1. If user is already signed in, redirect to home page
	if user.IsUser() {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 2. If user is not signed in, show sign in page
	redirect_to := "/"
	hx_current_url, err := url.Parse(r.Header.Get("HX-Current-URL"))

	if err == nil && hx_current_url.Path != "" && hx_current_url.Path != "/sign-in" {
		redirect_to = hx_current_url.Path
	}

	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		SignInMain("", redirect_to).Render(r.Context(), w)
		return
	}

	SignInPage(&user, "", redirect_to).Render(r.Context(), w)
}
