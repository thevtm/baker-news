package events

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/thevtm/baker-news/state"
)

func TestEventJSONMarshal(t *testing.T) {
	event := NewEvent("test_event", map[string]interface{}{
		"key": "value",
	})

	event_json, err := json.Marshal(event)

	if err != nil {
		t.Fatalf("failed to marshal event: %v", err)
	}

	t.Logf("event_json: %s", string(event_json))
}

func TestUserPostedEventJSONMarshalAndUnmarshal(t *testing.T) {
	event_data := UserVotedPostEventData{
		PostVoteID: 0,
		PostID:     1,
		UserID:     2,
		VoteValue:  state.VoteValueUp,
		Timestamp:  time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC),
	}

	event := NewEvent("user_voted_post", event_data)

	event_json, err := json.Marshal(event)

	if err != nil {
		t.Fatalf("failed to marshal event: %v", err)
	}

	t.Logf("event_json: %s", string(event_json))

	var unmarshaled_event Event
	err = json.Unmarshal(event_json, &unmarshaled_event)

	if err != nil {
		t.Fatalf("failed to unmarshal event: %v", err)
	}

	t.Logf("unmarshaled_event: %v", unmarshaled_event)
}
