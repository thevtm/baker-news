package commands

import (
	"context"
	"fmt"

	"github.com/thevtm/baker-news/state"
)

var ErrDeletePostCommandGuestNotAuthorized = NewCommandValidationError("guests are not authorized to delete posts")
var ErrDeletePostCommandUserNotAllowedToDeleteSomeoneElsePost = NewCommandValidationError("user is not allowed to delete someone else's post")

func (c *Commands) AuthDeletePost(user *state.User, post *state.Post) error {
	if user.IsGuest() {
		return ErrDeletePostCommandGuestNotAuthorized
	}

	if user.IsUser() && post.AuthorID != user.ID {
		return ErrDeletePostCommandUserNotAllowedToDeleteSomeoneElsePost
	}

	if user.IsAdmin() {
		return nil
	}

	panic("unreachable")
}

func (c *Commands) CanDeletePost(user *state.User, post *state.Post) bool {
	return c.AuthDeletePost(user, post) == nil
}

func (c *Commands) DeletePost(ctx context.Context, user *state.User, post *state.Post) error {
	queries := c.queries

	// 1. Check if user is allowed to vote
	if err := c.AuthDeletePost(user, post); err != nil {
		return err
	}

	// 2. Delete Post
	err := queries.DeletePost(ctx, post.ID)
	if err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
	}

	return nil
}
