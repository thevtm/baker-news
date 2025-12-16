package commands

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/thevtm/baker-news/state"
)

var ErrUserSubmitCommentCommandNotAuthorized = NewCommandValidationError("user is not authorized to comment")
var ErrUserSubmitCommentCommandPostOrCommentMustBeProvided = NewCommandValidationError("post or comment must be provided")

func (c *Commands) UserSubmitComment(
	ctx context.Context,
	user *state.User,
	post *state.Post,
	comment *state.Comment,
	content string) (state.Comment, error) {
	queries := c.queries

	if !user.IsUser() {
		return state.Comment{}, ErrUserSubmitCommentCommandNotAuthorized
	}

	var post_id int64
	var parent_comment_id pgtype.Int8

	if comment != nil {
		post_id = comment.PostID
		parent_comment_id = pgtype.Int8{Int64: comment.ID, Valid: true}

	} else if post != nil {
		post_id = post.ID
		parent_comment_id = pgtype.Int8{Valid: false}

	} else {
		return state.Comment{}, ErrUserSubmitCommentCommandPostOrCommentMustBeProvided
	}

	return queries.CreateComment(ctx, state.CreateCommentParams{
		PostID:          post_id,
		AuthorID:        user.ID,
		Content:         content,
		ParentCommentID: parent_comment_id,
	})
}
