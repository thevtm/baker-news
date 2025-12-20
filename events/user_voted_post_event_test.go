package events

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/thevtm/baker-news/state"
)

func TestUserPostedEventJSONMarshalAndUnmarshal(t *testing.T) {
	timestamp := pgtype.Timestamptz{
		Time:             time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC),
		Valid:            true,
		InfinityModifier: pgtype.Finite,
	}

	event_data := UserVotedPostEventData{
		ID:          0,
		PostID:      1,
		UserID:      2,
		Value:       state.VoteValueUp,
		DbCreatedAt: timestamp,
		DbUpdatedAt: timestamp,
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
