package events

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	"github.com/thevtm/baker-news/state"
)

func TestUserPostedEventJSONMarshalAndUnmarshal(t *testing.T) {
	timestamp := time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC)

	event_data := UserVotedPostEventData{
		PostVoteID: 0,
		PostID:     1,
		UserID:     2,
		VoteType:   state.VoteValueUp,
		Timestamp:  timestamp,
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

	if !reflect.DeepEqual(event, unmarshaled_event) {
		t.Fatalf("unmarshaled event does not match original event")
	}
}
