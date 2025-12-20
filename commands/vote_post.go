package commands

import (
	"context"
	"fmt"

	"github.com/thevtm/baker-news/events"
	"github.com/thevtm/baker-news/state"
)

var ErrVotePostCommandUserNotAllowed = NewCommandValidationError("user is not allowed to vote")
var ErrVotePostCommandInvalidVoteValue = NewCommandValidationError("invalid vote value")

func (c *Commands) UserVotePost(ctx context.Context, user *state.User, post_id int64, vote_value state.VoteValue) (state.PostVote, error) {
	queries := c.queries

	// 1. Check if user is allowed to vote
	if !user.IsUser() {
		return state.PostVote{}, ErrVotePostCommandUserNotAllowed
	}

	// 2. Vote
	var post_vote state.PostVote
	var err error

	if vote_value == state.VoteValueUp {
		arg := state.UpVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}

		post_vote, err = queries.UpVotePost(ctx, arg)

	} else if vote_value == state.VoteValueDown {
		arg := state.DownVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}

		post_vote, err = queries.DownVotePost(ctx, arg)

	} else if vote_value == state.VoteValueNone {
		arg := state.NoneVotePostParams{
			UserID: user.ID,
			PostID: post_id,
		}

		post_vote, err = queries.NoneVotePost(ctx, arg)

	} else {
		return state.PostVote{}, ErrVotePostCommandInvalidVoteValue
	}

	if err != nil {
		return state.PostVote{}, fmt.Errorf("failed to vote post: %w", err)
	}

	// 3. Publish event
	event_data := events.UserVotedPostEventData{
		PostVoteID: post_vote.ID,
		UserID:     user.ID,
		PostID:     post_id,
		VoteValue:  vote_value,
		Timestamp:  post_vote.DbCreatedAt.Time,
	}

	err = c.Events.PublishUserVotedPostEvent(ctx, &event_data)

	if err != nil {
		return state.PostVote{}, fmt.Errorf("failed to publish event: %w", err)
	}

	return post_vote, nil
}
