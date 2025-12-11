package post_comments

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/samber/lo"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/app/sign_in"
	"github.com/thevtm/baker-news/state"
)

type PostCommentsHandler struct {
	Queries *state.Queries
}

func NewPostCommentsHandler(queries *state.Queries) *PostCommentsHandler {
	return &PostCommentsHandler{Queries: queries}
}

func (p *PostCommentsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, queries := r.Context(), p.Queries

	user := sign_in.GetAuthContext(ctx).User

	// 1. Parse request
	post_id_str := r.PathValue("post_id")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_str),
	)

	post_id, err := strconv.ParseInt(post_id_str, 10, 64)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid post_id \"%s\"", post_id_str), http.StatusBadRequest)
		return
	}

	// 2. Retrieve post
	args := &state.GetPostWithAuthorAndUserVoteParams{
		PostID: post_id,
		UserID: user.ID,
	}
	pav, err := queries.GetPostWithAuthorAndUserVote(ctx, *args)

	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to retrieve Post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	post := pav.Post
	author := pav.User
	post_user_vote := lo.If(pav.VoteValue.Valid, pav.VoteValue.VoteValue).Else(state.VoteValueNone)

	// 3. Render the page
	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		PostMain(&post, &author, post_user_vote).Render(r.Context(), w)
		return
	}

	PostPage(&user, &post, &author, post_user_vote).Render(r.Context(), w)
}
