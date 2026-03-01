package events

import (
	"encoding/json"
	"fmt"
)

type EventData interface{}
type EventDataParser func(data json.RawMessage) (EventData, error)

// Multiple Dispatch
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
