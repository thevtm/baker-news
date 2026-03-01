package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"reflect"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/dapr/go-sdk/service/common"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/events"
)

var err_loc = reflect.TypeOf(Worker{}).Name()

type Worker struct {
	ctx context.Context

	DaprClient dapr.Client
	Commands   *commands.Commands

	pubsub_component_name string
	unsubscribe_funcs     []func() error
}

func New(daprClient dapr.Client, commands *commands.Commands, pubsub_component_name string) *Worker {
	return &Worker{
		DaprClient:            daprClient,
		Commands:              commands,
		ctx:                   context.Background(),
		pubsub_component_name: pubsub_component_name,
	}
}

func (w *Worker) Start() error {
	f := func(te *common.TopicEvent) common.SubscriptionResponseStatus {
		return UserVotedTopicSubscriber(w.Commands, te)
	}

	unsubscribe, err := w.DaprClient.SubscribeWithHandler(w.ctx,
		dapr.SubscriptionOptions{PubsubName: w.pubsub_component_name, Topic: events.UserVotedTopic}, f)

	if err != nil {
		return fmt.Errorf("[%s] failed to start subscriber for \"%s\" topic: %v",
			err_loc, events.UserVotedTopic, err)
	}

	w.unsubscribe_funcs = append(w.unsubscribe_funcs, unsubscribe)

	return nil
}

func (w *Worker) Stop() {
	for _, unsubscribe := range w.unsubscribe_funcs {
		if err := unsubscribe(); err != nil {
			slog.Error("failed to unsubscribe", slog.Any("error", err))
		}
	}
}

func UserVotedTopicSubscriber(commands *commands.Commands, topic_event *common.TopicEvent) common.SubscriptionResponseStatus {
	slog.Info("User Voted event received", slog.Any("event", topic_event))

	var event events.Event
	if err := json.Unmarshal(topic_event.RawData, &event); err != nil {
		slog.Error("failed to parse event data", slog.Any("error", err))
		return common.SubscriptionResponseStatusRetry
	}

	slog.Debug("Event parsed successfully", slog.Any("event", event))

	if event.Type == events.UserVotedPostEventDataType {
		data := event.Data.(events.UserVotedPostEventData)

		slog.Debug("UserVotedPostEventData", slog.Any("data", data))

		err := commands.SystemIncrementPostVoteCountsAggregate(context.Background(), data.Timestamp, data.VoteType)

		if err != nil {
			slog.Error("failed to increment post vote counts aggregate", slog.Any("error", err))
			return common.SubscriptionResponseStatusRetry
		}
	}

	slog.Info("Event handled successfully")
	return common.SubscriptionResponseStatusSuccess
}
