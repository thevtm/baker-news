package post_block

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type PostDeleteHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewPostDeleteHandler(queries *state.Queries, commands *commands.Commands) *PostDeleteHandler {
	return &PostDeleteHandler{Queries: queries, Commands: commands}
}

func (p *PostDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands, queries := r.Context(), p.Commands, p.Queries

	user := auth.GetAuthContext(ctx).User

	// 1. Parse request
	post_id_arg := r.FormValue("post_id")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_arg),
	)

	post_id, err := strconv.ParseInt(post_id_arg, 10, 64)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to parse post_id",
			slog.String("post_id", post_id_arg),
			slog.Any("error", err),
		)
		http.Error(w, "Invalid Post", http.StatusBadRequest)
		return
	}

	// 3. Delete Post
	post, err := queries.GetPost(ctx, post_id)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to retrieve Post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	if err := commands.DeletePost(ctx, &user, &post); err != nil {
		slog.ErrorContext(ctx, "Failed to delete post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Failed to delete post", http.StatusInternalServerError)
		return
	}

	slog.InfoContext(ctx, "Post deleted successfully", slog.Int64("post_id", post.ID))

	// 4. Render the response
	w.WriteHeader(http.StatusOK)
}
