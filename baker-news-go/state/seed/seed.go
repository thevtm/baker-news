package seed

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jaswdr/faker/v2"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/state"
)

type Seeder struct {
	queries *state.Queries
	faker   *faker.Faker
}

func CreateSeeder(query *state.Queries, f *faker.Faker) *Seeder {
	return &Seeder{queries: query, faker: f}
}

func (s *Seeder) CreateFakeUser(ctx context.Context) *state.User {
	f := s.faker

	for attempt := 0; ; attempt++ {
		if attempt >= 1 {
			panic("Failed to create user, too many attempts")
		}

		username := fmt.Sprintf("%s%d", f.Person().FirstName(), f.IntBetween(100, 999))
		params := state.CreateUserParams{Username: username, Role: state.UserRoleUser}
		new_user, err := s.queries.CreateUser(ctx, params)

		if err == nil {
			return &new_user
		}
	}
}

func (s *Seeder) CreateFakePost(ctx context.Context, author *state.User) *state.Post {
	f := s.faker

	new_post_params := state.CreatePostParams{
		Title:    f.Lorem().Sentence(f.IntBetween(2, 5)),
		Url:      f.Internet().URL(),
		AuthorID: author.ID,
	}

	new_post := lo.Must1(s.queries.CreatePost(ctx, new_post_params))

	return &new_post
}

func (s *Seeder) CreateFakePostVote(ctx context.Context, user *state.User, post *state.Post) *state.PostVote {
	up, down, none := string(state.VoteValueUp), string(state.VoteValueDown), string(state.VoteValueNone)

	// 70% up, 20% down, 10% none
	vote_type := s.faker.RandomStringElement([]string{up, up, up, up, up, up, up, down, down, none})

	user_id := user.ID
	post_id := post.ID

	if vote_type == up {
		up_vote_params := state.UpVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(s.queries.UpVotePost(ctx, up_vote_params))
		return &new_post_vote
	} else if vote_type == down {
		down_vote_params := state.DownVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(s.queries.DownVotePost(ctx, down_vote_params))
		return &new_post_vote
	} else if vote_type == none {
		none_vote_params := state.NoneVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(s.queries.NoneVotePost(ctx, none_vote_params))
		return &new_post_vote
	} else {
		panic("unreachable")
	}
}

func (s *Seeder) CreateFakeRootComment(ctx context.Context, author *state.User, post *state.Post) *state.Comment {
	f := s.faker

	new_comment_params := state.CreateCommentParams{
		PostID:   post.ID,
		AuthorID: author.ID,
		Content:  f.Lorem().Sentence(f.IntBetween(1, 10)),
	}

	new_comment := lo.Must1(s.queries.CreateComment(ctx, new_comment_params))

	return &new_comment
}

func (s *Seeder) CreateFakeChildComment(ctx context.Context, author *state.User, parent_comment *state.Comment) *state.Comment {
	f := s.faker

	new_comment_params := state.CreateCommentParams{
		PostID:          parent_comment.PostID,
		AuthorID:        author.ID,
		ParentCommentID: pgtype.Int8{Int64: parent_comment.ID, Valid: true},
		Content:         f.Lorem().Sentence(5),
	}

	new_comment := lo.Must1(s.queries.CreateComment(ctx, new_comment_params))

	return &new_comment
}

func (s *Seeder) CreateFakeCommentVote(ctx context.Context, user *state.User, comment *state.Comment) *state.CommentVote {
	up, down, none := string(state.VoteValueUp), string(state.VoteValueDown), string(state.VoteValueNone)

	// 70% up, 20% down, 10% none
	vote_type := s.faker.RandomStringElement([]string{up, up, up, up, up, up, up, up, down, down, none})

	user_id := user.ID
	comment_id := comment.ID

	if vote_type == up {
		up_vote_params := state.UpVoteCommentParams{CommentID: comment_id, UserID: user_id}
		new_comment_vote := lo.Must1(s.queries.UpVoteComment(ctx, up_vote_params))
		return &new_comment_vote
	} else if vote_type == down {
		down_vote_params := state.DownVoteCommentParams{CommentID: comment_id, UserID: user_id}
		new_comment_vote := lo.Must1(s.queries.DownVoteComment(ctx, down_vote_params))
		return &new_comment_vote
	} else if vote_type == none {
		none_vote_params := state.NoneVoteCommentParams{CommentID: comment_id, UserID: user_id}
		new_comment_vote := lo.Must1(s.queries.NoneVoteComment(ctx, none_vote_params))
		return &new_comment_vote
	} else {
		panic("unreachable")
	}
}
