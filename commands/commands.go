package commands

import (
	"github.com/thevtm/baker-news/events"
	"github.com/thevtm/baker-news/state"
)

type Commands struct {
	queries *state.Queries
	Events  *events.Events
}

func New(queries *state.Queries, events *events.Events) *Commands {
	return &Commands{queries: queries, Events: events}
}
