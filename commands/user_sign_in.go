package commands

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/thevtm/baker-news/state"
)

var ErrUserSignInUserNotFound = NewErrCommandValidationFailed("user not found")

func (c *Commands) UserSignIn(ctx context.Context, username string) (state.User, bool, error) {
	queries := c.queries
	var user state.User

	user, err := queries.GetUserByUsername(ctx, username)

	if errors.Is(err, pgx.ErrNoRows) {
		return user, false, nil
	}

	return user, err == nil, nil
}
