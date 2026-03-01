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

type PostCommentVoteHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewPostCommentVoteHandler(queries *state.Queries, commands *commands.Commands) *PostCommentVoteHandler {
	return &PostCommentVoteHandler{Queries: queries, Commands: commands}
}

func (p *PostCommentVoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands, queries := r.Context(), p.Commands, p.Queries

	user := auth.GetAuthContext(ctx).User

	// 1. Redirect to sign in if user is guest
	if user.IsGuest() {
		htmx.HTMXLocation(w, "/sign-in", "main")
		slog.Info("User is guest, redirecting to sign in")
		return
	}

	// 2. Parse request
	comment_id_arg := r.FormValue("comment_id")
	vote_value_arg := r.FormValue("vote_value")

	slog.DebugContext(ctx, "Args received",
		slog.String("comment_id", comment_id_arg),
		slog.String("vote_value", vote_value_arg),
	)

	comment_id, err := strconv.ParseInt(comment_id_arg, 10, 64)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to parse comment_id",
			slog.String("comment_id", comment_id_arg),
			slog.Any("error", err),
		)
		http.Error(w, "Invalid comment", http.StatusBadRequest)
		return
	}

	vote_value := state.VoteValue(vote_value_arg)

	// 3. Vote
	comment_vote, err := commands.UserVoteComment(ctx, &user, comment_id, vote_value)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to vote comment",
			slog.Int64("comment_id", comment_id),
			slog.Any("error", err),
		)
		http.Error(w, "Failed to vote", http.StatusInternalServerError)
		return
	}

	slog.InfoContext(ctx, "comment voted successfully",
		slog.Int64("comment_id", comment_vote.CommentID),
		slog.String("vote_value", string(comment_vote.Value)),
	)

	// 4. Render the response
	row, err := queries.CommentWithAuthor(ctx, comment_id)

	if err != nil {
		slog.ErrorContext(ctx, "Failed to retrieve comment",
			slog.Int64("comment_id", comment_vote.CommentID),
			slog.Any("error", err),
		)
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}

	comment := row.Comment
	author := row.User

	Comment(&comment, &author, vote_value).Render(ctx, w)
}
