package commands

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/thevtm/baker-news/state"
)

var ErrUserSignInCommandUserNotFound = NewErrCommandValidationFailed("user not found")
var ErrUserSignInCommandUsernameTooShort = NewErrCommandValidationFailed("username is too short")
var ErrUserSignInCommandUsernameTooLong = NewErrCommandValidationFailed("username is too long")

type UserSignInCommand struct {
	Username string
}

func NewUserSignInCommand(username string) (*UserSignInCommand, error) {
	if len(username) < 5 {
		return nil, ErrUserSignInCommandUsernameTooShort
	}

	if len(username) > 20 {
		return nil, ErrUserSignInCommandUsernameTooLong
	}

	cmd := UserSignInCommand{
		Username: username,
	}

	return &cmd, nil
}

func (s *UserSignInCommand) Execute(ctx context.Context, queries *state.Queries) (state.User, error) {
	username := s.Username

	user, err := queries.GetUserByUsername(ctx, username)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return state.User{}, ErrUserSignInCommandUserNotFound
		}

		return state.User{}, err
	}

	return user, nil
}
