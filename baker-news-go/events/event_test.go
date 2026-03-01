package events

import (
	"encoding/json"
	"testing"
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
