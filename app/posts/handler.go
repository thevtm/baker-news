package posts

import (
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app"
	"github.com/thevtm/baker-news/ui/posts_page"
)

type TopPosts struct {
	http.Handler
	app *app.App
}

func NewTopPosts() *TopPosts {
	return &TopPosts{}
}

type HTMXHeaders struct {
	HX_Request string
	HX_Target  string
}

func NewHTMXHeaders(header *http.Header) *HTMXHeaders {
	return &HTMXHeaders{
		HX_Request: header.Get("HX-Request"),
		HX_Target:  header.Get("HX-Target"),
	}
}

func (h *HTMXHeaders) IsHTMXRequest() bool {
	return h.HX_Request == "true"
}

func (p *TopPosts) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, queries := r.Context(), p.app.Queries

	// 1. Retrieve top posts
	posts, err := queries.TopPosts(ctx, 100)

	if err != nil {
		slog.ErrorContext(ctx, "Failed to retrieve Top Posts", slog.Any("error", err))
		http.Error(w, "Failed to retrieve Top Posts", http.StatusInternalServerError)
		return
	}

	// 2. Render the page
	htmx_headers := NewHTMXHeaders(&r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HX_Target == "main" {
		posts_page.PostsMain(posts).Render(r.Context(), w)
		return
	}

	posts_page.PostsPage(posts).Render(r.Context(), w)
}
