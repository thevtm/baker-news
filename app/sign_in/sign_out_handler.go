package sign_in

import (
	"net/http"
	"net/url"

	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
)

type UserSignOutHandler struct {
}

func NewUserSignOutHandler(queries *state.Queries) *UserSignOutHandler {
	return &UserSignOutHandler{}
}

func (h *UserSignOutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Sign out user
	SetAuthCookie(w, &GuestCookie)

	// 2. Redirect when HTMX request
	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() {
		redirect_to := "/"
		if u := htmx_headers.HXCurrentURL; u.Valid && u.URL.Path != "/sign-out" {
			redirect_to = htmx_headers.HXCurrentURL.URL.Path
		}

		htmx.HTMXLocation(w, redirect_to, "body")
		return
	}

	// 3. Redirect when non-HTMX request
	redirect_to := "/"
	referer_url, err := url.Parse(r.Header.Get("Referer"))

	// Not checking hostname creates an interesting attack vector :P
	if err == nil && referer_url.Path != "/sign-out" {
		redirect_to = referer_url.Path
	}

	http.Redirect(w, r, redirect_to, http.StatusSeeOther)
}
