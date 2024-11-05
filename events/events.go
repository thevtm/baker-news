package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"reflect"
	"time"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/thevtm/baker-news/state"
)

////////////////////////////////////////
// Event
////////////////////////////////////////

type EventData interface{}
type EventDataParser func(data json.RawMessage) (EventData, error)

var event_data_unmarshaler = map[string]EventDataParser{}

type Event struct {
	Type string    `json:"type"`
	Data EventData `json:"data"`
}

func NewEvent(event_type string, data interface{}) Event {
	return Event{
		Type: event_type,
		Data: data,
	}
}

func (e *Event) UnmarshalJSON(data []byte) error {
	var tmp struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal(data, &tmp); err != nil {
		return fmt.Errorf("failed to parse event: %w", err)
	}

	e.Type = tmp.Type
	data_parser, ok := event_data_unmarshaler[tmp.Type]

	if !ok {
		return fmt.Errorf("unknown event data parser for type: %s", tmp.Type)
	}

	event_data, err := data_parser(tmp.Data)

	if err != nil {
		return fmt.Errorf("failed to parse event data: %w", err)
	}

	e.Data = event_data
	return nil
}

////////////////////////////////////////
// Events
////////////////////////////////////////

type Events struct {
	DaprClient          dapr.Client
	PubSubComponentName string
}

func New(dapr_client dapr.Client, pub_sub_component_name string) *Events {
	return &Events{DaprClient: dapr_client, PubSubComponentName: pub_sub_component_name}
}

func (e *Events) Publish(ctx context.Context, topic string, event Event) error {
	event_json, err := json.Marshal(event)

	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	err = e.DaprClient.PublishEvent(ctx, e.PubSubComponentName, topic, event_json)

	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	slog.DebugContext(ctx, "Event published", slog.String("topic", topic), slog.String("event", string(event_json)))

	return nil
}

////////////////////////////////////////
// User Voted Post Event
////////////////////////////////////////

const UserVotedTopic = "post"
const UserVotedPostEventDataType = "user_voted_post"

type UserVotedPostEventData struct {
	PostVoteID int64           `json:"post_vote_id"`
	UserID     int64           `json:"user_id"`
	PostID     int64           `json:"post_id"`
	VoteValue  state.VoteValue `json:"vote_value"`
	Timestamp  time.Time       `json:"timestamp"`
}

func (e *Events) PublishUserVotedPostEvent(ctx context.Context, data *UserVotedPostEventData) error {
	event := NewEvent(UserVotedPostEventDataType, data)
	return e.Publish(ctx, UserVotedTopic, event)
}

func UnmarshalUserVotedPostEventData(data json.RawMessage) (EventData, error) {
	var event_data UserVotedPostEventData

	if err := json.Unmarshal(data, &event_data); err != nil {
		return nil, fmt.Errorf("failed to unmarshal %s: %w",
			reflect.TypeOf(UserVotedPostEventData{}).Name(), err)
	}

	return event_data, nil
}

func init() {
	event_data_unmarshaler[UserVotedPostEventDataType] = UnmarshalUserVotedPostEventData
}
