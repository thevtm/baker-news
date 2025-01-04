package commands

import (
	"context"
	"fmt"

	"github.com/thevtm/baker-news/state"
)

var ErrDeleteCommentCommandGuestNotAuthorized = NewCommandValidationError("guests are not authorized to delete comments")
var ErrDeleteCommentCommandUserNotAllowedToDeleteSomeoneElseComment = NewCommandValidationError("user is not allowed to delete someone else's comment")

func (c *Commands) AuthDeleteComment(user *state.User, comment *state.Comment) error {
	if user.IsGuest() {
		return ErrDeleteCommentCommandGuestNotAuthorized
	}

	if user.IsUser() && comment.AuthorID != user.ID {
		return ErrDeleteCommentCommandUserNotAllowedToDeleteSomeoneElseComment
	}

	if user.IsAdmin() {
		return nil
	}

	panic("unreachable")
}

func (c *Commands) CanDeleteComment(user *state.User, comment *state.Comment) bool {
	return c.AuthDeleteComment(user, comment) == nil
}

func (c *Commands) DeleteComment(ctx context.Context, user *state.User, comment *state.Comment) error {
	queries := c.queries

	// 1. Check if user is allowed to vote
	if err := c.AuthDeleteComment(user, comment); err != nil {
		return err
	}

	// 2. Delete Comment
	err := queries.DeleteComment(ctx, comment.ID)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	return nil
}
