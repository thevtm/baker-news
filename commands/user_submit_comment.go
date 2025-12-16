package commands

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/negrel/assert"
	"github.com/thevtm/baker-news/state"
)

var ErrUserSubmitCommentNotAuthorized = NewCommandValidationError("user is not authorized to comment")
var ErrUserSubmitCommentPostOrCommentMustBeProvided = NewCommandValidationError("post or comment must be provided")

func (c *Commands) UserAddCommentToPost(ctx context.Context, user *state.User,
	post *state.Post, content string) (state.Comment, error) {

	return c.userSubmitComment(ctx, user, post, nil, content)
}

func (c *Commands) UserSubmitCommentForComment(ctx context.Context, user *state.User,
	parent_comment *state.Comment, content string) (state.Comment, error) {

	return c.userSubmitComment(ctx, user, nil, parent_comment, content)
}

func (c *Commands) userSubmitComment(
	ctx context.Context,
	user *state.User,
	post *state.Post,
	parent_comment *state.Comment,
	content string) (state.Comment, error) {
	queries := c.queries

	assert.True((post == nil) != (parent_comment == nil), "either a post or a comment must be provided, not both")

	if !user.IsUser() {
		return state.Comment{}, ErrUserSubmitCommentNotAuthorized
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
		return state.Comment{}, ErrUserSubmitCommentPostOrCommentMustBeProvided
	}

	return queries.CreateComment(ctx, state.CreateCommentParams{
		PostID:          post_id,
		AuthorID:        user.ID,
		Content:         content,
		ParentCommentID: parent_comment_id,
	})
}
