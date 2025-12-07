package signin

import (
	"net/http"

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

	if user.IsUser() {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	htmx_headers := htmx.NewHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HX_Target == "main" {
		SignInMain("").Render(r.Context(), w)
		return
	}

	SignInPage(&user, "").Render(r.Context(), w)
}
