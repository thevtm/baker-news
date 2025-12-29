package commands

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/negrel/assert"
	"github.com/thevtm/baker-news/state"
)

var ErrSubmitCommentCommandNotAuthorized = NewCommandValidationError("user is not authorized to comment")
var ErrSubmitCommentCommandPostOrCommentMustBeProvided = NewCommandValidationError("post or comment must be provided")

func (c *Commands) SubmitComment(
	ctx context.Context,
	user *state.User,
	post *state.Post,
	parent_comment *state.Comment,
	content string) (state.Comment, error) {
	queries := c.queries

	assert.True((post == nil) != (parent_comment == nil), "either a post or a comment must be provided, not both")

	if user.IsGuest() {
		return state.Comment{}, ErrSubmitCommentCommandNotAuthorized
	}

	var post_id int64
	var parent_comment_id pgtype.Int8

	if parent_comment != nil {
		post_id = parent_comment.PostID
		parent_comment_id = pgtype.Int8{Int64: parent_comment.ID, Valid: true}

	} else if post != nil {
		post_id = post.ID
		parent_comment_id = pgtype.Int8{Valid: false}

	} else {
		return state.Comment{}, ErrSubmitCommentCommandPostOrCommentMustBeProvided
	}

	return queries.CreateComment(ctx, state.CreateCommentParams{
		PostID:          post_id,
		AuthorID:        user.ID,
		Content:         content,
		ParentCommentID: parent_comment_id,
	})
}
