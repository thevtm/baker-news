package top_posts

import (
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
)

type TopPostsHandler struct {
	queries *state.Queries
}

func NewTopPosts(queries *state.Queries) *TopPostsHandler {
	return &TopPostsHandler{queries: queries}
}

func (p *TopPostsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, queries := r.Context(), p.queries

	user := auth.GetAuthContext(ctx).User

	// 1. Retrieve top posts
	query_params := &state.TopPostsWithAuthorAndVotesForUserParams{
		Limit:  30,
		UserID: user.ID,
	}
	posts, err := queries.TopPostsWithAuthorAndVotesForUser(ctx, *query_params)

	slog.DebugContext(r.Context(), "Top Posts retrieved", slog.Int("count", len(posts)))

	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to retrieve Top Posts", slog.Any("error", err))
		http.Error(w, "Failed to retrieve Top Posts", http.StatusInternalServerError)
		return
	}

	// 2. Render the page
	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		PostsMain(&posts).Render(r.Context(), w)
		return
	}

	PostsPage(&user, &posts).Render(r.Context(), w)
}
