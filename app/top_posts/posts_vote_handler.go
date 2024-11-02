package top_posts

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/app/shared_components"
	"github.com/thevtm/baker-news/app/sign_in"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type PostListVoteHandler struct {
	Commands *commands.Commands
}

func NewPostListVoteHandler(commands *commands.Commands) *PostListVoteHandler {
	return &PostListVoteHandler{Commands: commands}
}

func (p *PostListVoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands := r.Context(), p.Commands

	user := sign_in.GetAuthContext(ctx).User

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
	shared_components.PostVoteBoxContents(post_vote.PostID, post_vote.Value).Render(ctx, w)
}
