package post_comments_page

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type PostCommentAddHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewPostCommentAddHandler(queries *state.Queries, commands *commands.Commands) *PostCommentAddHandler {
	return &PostCommentAddHandler{Queries: queries, Commands: commands}
}

func (p *PostCommentAddHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	content_arg := r.FormValue("content")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_arg),
		slog.String("content", content_arg),
	)

	post_id, err := strconv.ParseInt(post_id_arg, 10, 64)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to parse post_id",
			slog.String("post_id", post_id_arg),
			slog.Any("error", err),
		)
		http.Error(w, "Invalid Comment", http.StatusBadRequest)
		return
	}

	content := content_arg

	// 3. Fetch post
	post, err := queries.GetPost(ctx, post_id)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to fetch post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Failed to fetch post", http.StatusInternalServerError)
		return
	}

	// 4. Comment
	comment, err := commands.UserSubmitComment(ctx, &user, &post, nil, content)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to vote comment",
			slog.Int64("comment_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Failed to vote comment", http.StatusInternalServerError)
		return
	}

	// 5. Render response
	comment_node := NewPostCommentNode(&comment, &user, state.VoteValueNone)
	CommentNode(comment_node).Render(ctx, w)
}
