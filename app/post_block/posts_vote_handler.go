package post_block

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type PostListVoteHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewPostListVoteHandler(queries *state.Queries, commands *commands.Commands) *PostListVoteHandler {
	return &PostListVoteHandler{Queries: queries, Commands: commands}
}

func (p *PostListVoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	vote_value_arg := r.FormValue("vote_value")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_arg),
		slog.String("vote_value", vote_value_arg),
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

	vote_value := state.VoteValue(vote_value_arg)

	// 3. Vote
	post_vote, err := commands.UserVotePost(ctx, &user, post_id, vote_value)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to vote post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Failed to vote", http.StatusInternalServerError)
		return
	}

	slog.InfoContext(ctx, "Post voted successfully",
		slog.Int64("post_id", post_vote.PostID),
		slog.String("vote_value", string(post_vote.Value)),
	)

	// 4. Render the response
	row, err := queries.PostWithAuthor(ctx, post_id)

	if err != nil {
		slog.ErrorContext(ctx, "Failed to retrieve Post",
			slog.Int64("post_id", post_vote.PostID),
			slog.Any("error", err),
		)
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	post := row.Post
	author := row.User

	Post(&post, &author, vote_value).Render(ctx, w)
}
