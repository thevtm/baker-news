package commands

import (
	"context"

	"github.com/thevtm/baker-news/state"
)

var ErrVotePostCommandUserNotAllowed = NewErrCommandValidationFailed("user is not allowed to vote")
var ErrVotePostCommandInvalidVoteValue = NewErrCommandValidationFailed("invalid vote value")

type VotePostCommand struct {
	user  *state.User
	post  *state.Post
	value state.VoteValue
}

func NewVotePostCommand(user *state.User, post *state.Post, value state.VoteValue) (*VotePostCommand, error) {
	if user.Role != state.UserRoleUser {
		return nil, ErrVotePostCommandUserNotAllowed
	}

	cmd := VotePostCommand{
		user:  user,
		post:  post,
		value: value,
	}

	return &cmd, nil
}

func (s *VotePostCommand) Execute(ctx context.Context, queries *state.Queries) (state.PostVote, error) {
	user := s.user
	post_id := s.post.ID
	value := s.value

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
