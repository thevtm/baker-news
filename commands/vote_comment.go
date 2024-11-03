package commands

import (
	"context"

	"github.com/thevtm/baker-news/state"
)

var ErrVoteCommentCommandUserNotAllowed = NewCommandValidationError("user is not allowed to vote")
var ErrVoteCommentCommandInvalidVoteValue = NewCommandValidationError("invalid vote value")

func (c *Commands) UserVoteComment(ctx context.Context, user *state.User, comment_id int64, value state.VoteValue) (state.CommentVote, error) {
	queries := c.queries

	if !user.IsUser() {
		return state.CommentVote{}, ErrVoteCommentCommandUserNotAllowed
	}

	if value == state.VoteValueUp {
		arg := state.UpVoteCommentParams{
			UserID:    user.ID,
			CommentID: comment_id,
		}
		return queries.UpVoteComment(ctx, arg)
	}

	if value == state.VoteValueDown {
		arg := state.DownVoteCommentParams{
			UserID:    user.ID,
			CommentID: comment_id,
		}
		return queries.DownVoteComment(ctx, arg)
	}

	if value == state.VoteValueNone {
		arg := state.NoneVoteCommentParams{
			UserID:    user.ID,
			CommentID: comment_id,
		}
		return queries.NoneVoteComment(ctx, arg)
	}

	return state.CommentVote{}, ErrVoteCommentCommandInvalidVoteValue
}
