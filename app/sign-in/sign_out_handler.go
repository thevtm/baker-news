package signin

import (
	"net/http"

	"github.com/thevtm/baker-news/state"
)

type UserSignOutHandler struct {
}

func NewUserSignOutHandler(queries *state.Queries) *UserSignOutHandler {
	return &UserSignOutHandler{}
}

func (h *UserSignOutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	SetGuestUserCookie(w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
