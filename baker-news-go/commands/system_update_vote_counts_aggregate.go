package commands

import (
	"context"
	"fmt"
	"reflect"
	"runtime"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/thevtm/baker-news/state"
)

var err_loc string

func init() {
	err_loc = runtime.FuncForPC(reflect.ValueOf((*Commands).SystemIncrementPostVoteCountsAggregate).Pointer()).Name()
}

var SystemIncrementPostVoteCountsAggregateInvalidTimestampErr = NewCommandValidationError("invalid timestamp")

func (c *Commands) SystemIncrementPostVoteCountsAggregate(
	ctx context.Context, timestamp time.Time, vote_value state.VoteValue) error {
	var err error

	interval := timestamp.Truncate(time.Second * 10)
	pg_interval := pgtype.Timestamp{Valid: true, Time: interval}

	switch vote_value {
	case state.VoteValueUp:
		err = c.queries.IncrementVoteCountsAggregateUpVote(ctx, pg_interval)
	case state.VoteValueDown:
		err = c.queries.IncrementVoteCountsAggregateDownVote(ctx, pg_interval)
	case state.VoteValueNone:
		err = c.queries.IncrementVoteCountsAggregateNoneVote(ctx, pg_interval)
	}

	if err != nil {
		return fmt.Errorf("[%s] failed to increment vote counts aggregate: %w", err_loc, err)
	}

	return nil
}
