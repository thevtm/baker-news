package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"reflect"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/dapr/go-sdk/service/common"
	"github.com/thevtm/baker-news/events"
)

var err_loc = reflect.TypeOf(Worker{}).Name()

type Worker struct {
	DaprClient            dapr.Client
	ctx                   context.Context
	pubsub_component_name string
	subscriptions         []*dapr.Subscription
	unsubscribe_funcs     []func() error
}

func New(daprClient dapr.Client, pubsub_component_name string) *Worker {
	return &Worker{
		DaprClient:            daprClient,
		ctx:                   context.Background(),
		pubsub_component_name: pubsub_component_name,
	}
}

func (w *Worker) Start() error {
	unsubscribe, err := w.DaprClient.SubscribeWithHandler(w.ctx,
		dapr.SubscriptionOptions{PubsubName: w.pubsub_component_name, Topic: events.UserVotedTopic}, UserVotedTopicSubscriber)

	if err != nil {
		return fmt.Errorf("[%s] failed to start subscriber for \"%s\" topic: %v",
			err_loc, events.UserVotedTopic, err)
	}

	w.unsubscribe_funcs = append(w.unsubscribe_funcs, unsubscribe)

	return nil
}

func (w *Worker) Stop() {
	for _, sub := range w.subscriptions {
		sub.Close()
	}

	for _, unsubscribe := range w.unsubscribe_funcs {
		if err := unsubscribe(); err != nil {
			slog.Error("failed to unsubscribe", slog.Any("error", err))
		}
	}
}

func UserVotedTopicSubscriber(topic_event *common.TopicEvent) common.SubscriptionResponseStatus {
	slog.Info("received event", slog.String("topic", events.UserVotedTopic), slog.Any("event", topic_event))

	var event events.Event
	if err := json.Unmarshal(topic_event.RawData, &event); err != nil {
		slog.Error("failed to parse event data")
		return common.SubscriptionResponseStatusRetry
	}

	slog.Info("event received and parsed successfully", slog.Any("event", event))

	return common.SubscriptionResponseStatusSuccess
}
