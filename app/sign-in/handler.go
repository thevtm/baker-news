package signin

import (
	"github.com/thevtm/baker-news/state"
)

////////////////////////////////////////
// User Sign Up
////////////////////////////////////////

type UserSignUpPageHandler struct {
	queries *state.Queries
}

func NewUserSignUpHandler(queries *state.Queries) *UserSignUpPageHandler {
	return &UserSignUpPageHandler{queries: queries}
}
