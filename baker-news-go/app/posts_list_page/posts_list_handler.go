package posts_list_page

import (
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/app/post_block"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type TopPostsHandler struct {
	queries  *state.Queries
	commands *commands.Commands
}

func NewTopPosts(queries *state.Queries) *TopPostsHandler {
	return &TopPostsHandler{queries: queries}
}

func (p *TopPostsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands, queries := r.Context(), p.commands, p.queries

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
	post_blocks_params := posts_to_post_block_params(commands, &user, posts)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		PostsListMain(&post_blocks_params).Render(r.Context(), w)
		return
	}

	PostsListPage(&user, &post_blocks_params).Render(r.Context(), w)
}

func posts_to_post_block_params(commands *commands.Commands, logged_in_user *state.User, posts []state.TopPostsWithAuthorAndVotesForUserRow) []post_block.PostBlockParams {
	post_params := make([]post_block.PostBlockParams, len(posts))

	for i, post := range posts {
		post_params[i].Post = &post.Post
		post_params[i].Author = &post.User

		if post.VoteValue.Valid {
			post_params[i].VoteValue = post.VoteValue.VoteValue
		} else {
			post_params[i].VoteValue = state.VoteValueNone
		}

		can_delete_post := commands.CanDeletePost(logged_in_user, &post.Post)
		if can_delete_post {
			post_params[i].DeleteStrategy = post_block.DeleteStrategyRemove
		} else {
			post_params[i].DeleteStrategy = post_block.DeleteStrategyNotAuthorized
		}
	}

	return post_params
}
