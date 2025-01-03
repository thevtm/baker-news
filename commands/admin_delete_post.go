package commands

import (
	"context"
	"fmt"
	"net/url"

	"github.com/thevtm/baker-news/state"
)

var ErrUserCreatePostCommandUserNotAllowed = NewCommandValidationError("user is not allowed to submit a post")

func (c *Commands) UserSubmitPost(ctx context.Context, user *state.User, post_title string, post_url string) (state.Post, error) {
	queries := c.queries

	// 1. Check if user is allowed to vote
	if !user.IsUser() {
		return state.Post{}, ErrUserCreatePostCommandUserNotAllowed
	}

	// 2. Validate URL
	if _, err := url.Parse(post_url); err != nil {
		return state.Post{}, fmt.Errorf("failed to parse URL: %w", err)
	}

	// 3. Create post
	params := state.CreatePostParams{
		Title:    post_title,
		Url:      post_url,
		AuthorID: user.ID,
	}

	new_post, err := queries.CreatePost(ctx, params)
	if err != nil {
		return state.Post{}, fmt.Errorf("failed to create post: %w", err)
	}

	return new_post, nil
}
