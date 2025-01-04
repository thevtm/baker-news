package post_comments_page

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/negrel/assert"
	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type PostSubmitCommentHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewPostSubmitCommentHandler(queries *state.Queries, commands *commands.Commands) *PostSubmitCommentHandler {
	return &PostSubmitCommentHandler{Queries: queries, Commands: commands}
}

func render_success(ctx context.Context, w http.ResponseWriter, comment *state.Comment, author *state.User) {
	comment_node := NewPostCommentNode(comment, author, state.VoteValueNone)
	err := CommentNode(comment_node).Render(ctx, w)

	if err != nil {
		slog.ErrorContext(ctx, "Failed to render comment node", slog.Any("error", err))
		http.Error(w, "Failed to render comment node", http.StatusInternalServerError)
	}
}

func (p *PostSubmitCommentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands, queries := r.Context(), p.Commands, p.Queries

	user := auth.GetAuthContext(ctx).User

	// 1. Redirect to sign in if user is guest
	if user.IsGuest() {
		htmx.HTMXLocation(w, "/sign-in", "main")
		slog.Info("User is guest, redirecting to sign in")
		return
	}

	// 2. Parse request
	post_id_arg := r.FormValue("post_id")
	parent_comment_id_arg := r.FormValue("parent_comment_id")
	content_arg := r.FormValue("content")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_arg),
		slog.String("parent_comment_id", parent_comment_id_arg),
		slog.String("content", content_arg),
	)

	content := content_arg

	assert.True((post_id_arg == "") != (parent_comment_id_arg == ""), "either a post or a comment must be provided, but not both")

	// 3. Add Comment to Post
	if post_id_arg != "" {
		// 3.1 Parse post_id
		post_id, err := strconv.ParseInt(post_id_arg, 10, 64)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to parse post_id",
				slog.String("post_id", post_id_arg),
				slog.Any("error", err),
			)
			http.Error(w, "Invalid Comment", http.StatusBadRequest)
			return
		}

		// 3.2 Fetch post
		post, err := queries.GetPost(ctx, post_id)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to fetch post",
				slog.Int64("post_id", post_id),
				slog.Any("error", err),
			)
			http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
			return
		}

		// 3.3 Create Comment
		comment, err := commands.SubmitComment(ctx, &user, &post, nil, content)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to add comment to post",
				slog.Int64("post_id", post_id),
				slog.Any("error", err),
			)
			http.Error(w, "Failed to add comment to post", http.StatusInternalServerError)
			return
		}

		slog.InfoContext(ctx, "Comment added to post", slog.Int64("comment_id", comment.ID))

		// 3.4 Render response
		render_success(r.Context(), w, &comment, &user)
		return
	}

	// 4. Reply to Comment
	if parent_comment_id_arg != "" {
		// 4.1 Parse parent_comment_id_arg
		parent_comment_id, err := strconv.ParseInt(parent_comment_id_arg, 10, 64)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to parse parent_comment_id",
				slog.String("parent_comment_id", parent_comment_id_arg), slog.Any("error", err))
			http.Error(w, "Invalid Parent Comment", http.StatusBadRequest)
			return
		}

		// 4.2 Fetch parent_comment
		parent_comment, err := queries.GetComment(ctx, parent_comment_id)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to fetch parent comment",
				slog.Int64("parent_comment_id", parent_comment_id), slog.Any("error", err))
			http.Error(w, "Failed to fetch parent comment", http.StatusInternalServerError)
			return
		}

		// 4.3 Create Comment
		comment, err := commands.SubmitComment(ctx, &user, nil, &parent_comment, content)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to reply to comment", slog.Any("error", err))
			http.Error(w, "Failed to add comment to comment", http.StatusInternalServerError)
			return
		}

		// 4.4 Render response
		render_success(r.Context(), w, &comment, &user)
		return
	}

	// 5. Invalid request
	err := fmt.Errorf("neither post or parent comment were provided")
	slog.ErrorContext(ctx, "Invalid request", slog.Any("error", err))
	http.Error(w, "Invalid request", http.StatusBadRequest)
}
