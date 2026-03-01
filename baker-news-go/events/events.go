package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	dapr "github.com/dapr/go-sdk/client"
)

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

	err = e.DaprClient.PublishEvent(ctx, e.PubSubComponentName, topic, event_json,
		dapr.PublishEventWithContentType("application/json; charset=utf-8"),
		dapr.PublishEventWithMetadata(map[string]string{"type": "com.baker-news.events.v1.foobar"}))

	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	slog.DebugContext(ctx, "Event published", slog.String("topic", topic), slog.String("event", string(event_json)))

	return nil
}
