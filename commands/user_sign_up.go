package commands

import (
	"context"
	"fmt"

	"github.com/thevtm/baker-news/state"
)

var ErrUserSignUpCommandUsernameAlreadyTaken = NewErrCommandValidationFailed("username is already taken")
var ErrUserSignUpCommandUsernameTooShort = NewErrCommandValidationFailed("username is too short")
var ErrUserSignUpCommandUsernameTooLong = NewErrCommandValidationFailed("username is too long")

func (c *Commands) UserSignUp(ctx context.Context, username string) (state.User, error) {
	queries := c.queries
	var user state.User

	if len(username) < 5 {
		return user, ErrUserSignUpCommandUsernameTooShort
	}

	if len(username) > 20 {
		return user, ErrUserSignUpCommandUsernameTooLong
	}

	is_username_taken, err := queries.IsUsernameTaken(ctx, username)

	if err != nil {
		return state.User{}, fmt.Errorf("failed to verify if username was taken: %w", err)
	}

	if is_username_taken {
		return state.User{}, ErrUserSignUpCommandUsernameAlreadyTaken
	}

	arg := state.CreateUserParams{
		Username: username,
		Role:     state.UserRoleUser,
	}

	return queries.CreateUser(ctx, arg)
}
