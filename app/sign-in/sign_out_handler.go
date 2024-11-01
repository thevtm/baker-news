package signin

import (
	"net/http"

	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/app/template_page"
	"github.com/thevtm/baker-news/state"
)

type UserSignOutHandler struct {
}

func NewUserSignOutHandler(queries *state.Queries) *UserSignOutHandler {
	return &UserSignOutHandler{}
}

func (h *UserSignOutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	SetAuthCookie(w, &GuestCookie)
	user := state.UserGuest

	htmx_headers := htmx.NewHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HX_Target == "nav-auth" {
		template_page.NavAuth(&user).Render(r.Context(), w)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}
