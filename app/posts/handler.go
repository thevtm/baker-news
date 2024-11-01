package posts

import (
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
	"github.com/thevtm/baker-news/ui/posts_page"
)

type TopPostsHandler struct {
	queries *state.Queries
}

func NewTopPosts(queries *state.Queries) *TopPostsHandler {
	return &TopPostsHandler{queries: queries}
}

func (p *TopPostsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, queries := r.Context(), p.queries

	// 1. Retrieve top posts
	query_params := &state.TopPostsWithAuthorAndVotesForUserParams{
		Limit:  30,
		UserID: 1545,
	}
	posts, err := queries.TopPostsWithAuthorAndVotesForUser(ctx, *query_params)

	slog.DebugContext(r.Context(), "Top Posts retrieved", slog.Int("count", len(posts)))

	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to retrieve Top Posts", slog.Any("error", err))
		http.Error(w, "Failed to retrieve Top Posts", http.StatusInternalServerError)
		return
	}

	// 2. Render the page
	htmx_headers := htmx.NewHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HX_Target == "main" {
		posts_page.PostsMain(&posts).Render(r.Context(), w)
		return
	}

	posts_page.PostsPage(&posts).Render(r.Context(), w)
}
