package commands

import (
	"context"

	"github.com/thevtm/baker-news/state"
)

var ErrVotePostCommandUserNotAllowed = NewCommandValidationError("user is not allowed to vote")
var ErrVotePostCommandInvalidVoteValue = NewCommandValidationError("invalid vote value")

func (c *Commands) UserVotePost(ctx context.Context, user *state.User, post_id int64, value state.VoteValue) (state.PostVote, error) {
	queries := c.queries

	if !user.IsUser() {
		return state.PostVote{}, ErrVotePostCommandUserNotAllowed
	}

	if value == state.VoteValueUp {
		arg := state.UpVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}
		return queries.UpVotePost(ctx, arg)
	}

	if value == state.VoteValueDown {
		arg := state.DownVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}
		return queries.DownVotePost(ctx, arg)
	}

	if value == state.VoteValueNone {
		arg := state.NoneVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}
		return queries.NoneVotePost(ctx, arg)
	}

	return state.PostVote{}, ErrVotePostCommandInvalidVoteValue
}
