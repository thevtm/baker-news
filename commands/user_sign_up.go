package commands

import (
	"context"

	"github.com/thevtm/baker-news/state"
)

var ErrUserSignUpCommandUsernameAlreadyTaken = NewErrCommandValidationFailed("username is already taken")
var ErrUserSignUpCommandUsernameTooShort = NewErrCommandValidationFailed("username is too short")
var ErrUserSignUpCommandUsernameTooLong = NewErrCommandValidationFailed("username is too long")

type UserSignUpCommand struct {
	Username string
}

func NewUserSignUpCommand(username string) (*UserSignUpCommand, error) {
	if len(username) < 5 {
		return nil, ErrUserSignUpCommandUsernameTooShort
	}

	if len(username) > 20 {
		return nil, ErrUserSignUpCommandUsernameTooLong
	}

	cmd := UserSignUpCommand{
		Username: username,
	}

	return &cmd, nil
}

func (s *UserSignUpCommand) Execute(ctx context.Context, queries *state.Queries) (state.User, error) {
	username := s.Username

	is_username_taken, err := queries.IsUsernameTaken(ctx, username)

	if err != nil {
		return state.User{}, err
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
