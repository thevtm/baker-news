package events

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/thevtm/baker-news/state"
)

const UserVotedPostEventDataType = "user_voted_post"

var err_loc = reflect.TypeOf(UserVotedPostEventData{}).Name()

type UserVotedPostEventData struct {
	PostVoteID int64              `json:"post_vote_id"`
	PostID     int64              `json:"post_id"`
	UserID     int64              `json:"user_id"`
	VoteType   state.VoteValue    `json:"vote_type"`
	Timestamp  pgtype.Timestamptz `json:"timestamp"`
}

func NewUserVotedPostEventData(post_vote_id, post_id, user_id int64, vote_type state.VoteValue, timestamp pgtype.Timestamptz) UserVotedPostEventData {
	return UserVotedPostEventData{
		PostVoteID: post_vote_id,
		PostID:     post_id,
		UserID:     user_id,
		VoteType:   vote_type,
		Timestamp:  timestamp,
	}
}

func (e *Events) PublishUserVotedPostEvent(ctx context.Context, data *UserVotedPostEventData) error {
	event := NewEvent(UserVotedPostEventDataType, data)
	return e.Publish(ctx, UserVotedTopic, event)
}

func UnmarshalUserVotedPostEventData(data json.RawMessage) (EventData, error) {
	var event_data UserVotedPostEventData

	if err := json.Unmarshal(data, &event_data); err != nil {
		return nil, fmt.Errorf("[%s] failed to unmarshal: %w", err_loc, err)
	}

	return event_data, nil
}

func init() {
	event_data_unmarshaler[UserVotedPostEventDataType] = UnmarshalUserVotedPostEventData
}
