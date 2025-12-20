package events

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/thevtm/baker-news/state"
)

const UserVotedPostEventDataType = "user_voted_post"

var err_loc = reflect.TypeOf(UserVotedPostEventData{}).Name()

type UserVotedPostEventData = state.PostVote

// type UserVotedPostEventData struct {
// 	PostVoteID int64           `json:"post_vote_id"`
// 	UserID     int64           `json:"user_id"`
// 	PostID     int64           `json:"post_id"`
// 	VoteValue  state.VoteValue `json:"vote_value"`
// 	Timestamp  time.Time       `json:"timestamp"`
// }

func (e *Events) PublishUserVotedPostEvent(ctx context.Context, data *UserVotedPostEventData) error {
	event := NewEvent(UserVotedPostEventDataType, data)
	return e.Publish(ctx, PostEventsTopic, event)
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
