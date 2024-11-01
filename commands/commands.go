package commands

import (
	"github.com/thevtm/baker-news/state"
)

type Commands struct {
	queries *state.Queries
}

func New(queries *state.Queries) *Commands {
	return &Commands{queries: queries}
}
