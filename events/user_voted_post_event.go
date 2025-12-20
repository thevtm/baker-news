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
