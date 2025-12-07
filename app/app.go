package app

import "github.com/thevtm/baker-news/state"

type App struct {
	Queries *state.Queries
}

func NewApp(queries *state.Queries) *App {
	return &App{Queries: queries}
}
