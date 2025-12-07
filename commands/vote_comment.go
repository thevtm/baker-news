package commands

import (
	"context"

	"github.com/thevtm/baker-news/state"
)

var ErrVoteCommentCommandUserNotAllowed = NewErrCommandValidationFailed("user is not allowed to vote")
var ErrVoteCommentCommandInvalidVoteValue = NewErrCommandValidationFailed("invalid vote value")

type VoteCommentCommand struct {
	user    *state.User
	comment *state.Comment
	value   state.VoteValue
}

func NewVoteCommentCommand(user *state.User, comment *state.Comment, value state.VoteValue) (*VoteCommentCommand, error) {
	if user.Role != state.UserRoleUser {
		return nil, ErrVoteCommentCommandUserNotAllowed
	}

	cmd := VoteCommentCommand{
		user:    user,
		comment: comment,
		value:   value,
	}

	return &cmd, nil
}

func (s *VoteCommentCommand) Execute(ctx context.Context, queries *state.Queries) (state.CommentVote, error) {
	user := s.user
	comment_id := s.comment.ID
	value := s.value

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
