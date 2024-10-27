package main

import (
	"context"
	"fmt"
	"math/rand/v2"

	"github.com/jackc/pgx/v5"
	"github.com/jaswdr/faker/v2"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/state"
)

var ctx = context.Background()
var conn = lo.Must1(pgx.Connect(ctx, "postgres://postgres:password@localhost:5432/baker_news"))
var queries = state.New(conn)
var f faker.Faker = faker.New()

func main() {
	fmt.Printf("Seeding database...\n")
	fmt.Println("")

	// 1. Setup
	defer conn.Close(ctx)
	tx := lo.Must(conn.Begin(ctx))
	defer tx.Rollback(ctx)

	new_users := make([]*state.User, 0)
	new_posts := make([]*state.Post, 0)
	commands := make([]func(), 0)

	num_new_users := 100
	num_new_posts := 10
	num_new_post_votes := 500

	// 2. Create initial records
	create_fake_user_command := func() func() {
		return func() {
			new_user := CreateFakeUser()
			new_users = append(new_users, new_user)
			fmt.Printf("Created user: %v\n", new_user)
		}
	}

	create_fake_post_command := func() func() {
		return func() {
			author := new_users[f.IntBetween(0, len(new_users)-1)]
			new_post := CreateFakePost(author)
			new_posts = append(new_posts, new_post)
			fmt.Printf("Created post: %v\n", new_post)
		}
	}

	create_fake_user_command()()
	num_new_users--

	create_fake_post_command()()
	num_new_posts--

	// 2. Create Users Command
	for i := 0; i < num_new_users; i++ {
		commands = append(commands, create_fake_user_command())
	}

	// 3. Create Posts Command
	for i := 0; i < num_new_posts; i++ {
		commands = append(commands, create_fake_post_command())
	}

	// 4. Create Post Votes Command
	for i := 0; i < num_new_post_votes; i++ {
		commands = append(commands, func() {
			post := new_posts[f.IntBetween(0, len(new_posts)-1)]
			user := new_users[f.IntBetween(0, len(new_users)-1)]
			new_post_vote := CreateFakePostVote(user, post)
			fmt.Printf("Created post vote: %v\n", new_post_vote)
		})
	}

	// Execute commands
	rand.Shuffle(len(commands), func(i, j int) {
		commands[i], commands[j] = commands[j], commands[i]
	})

	for _, command := range commands {
		command()
	}

	// rand.Shuffle()

	// panic("stop here")

	fmt.Println("")

	tx.Commit(ctx)

	fmt.Println("Database seeded.")
}

func CreateFakePostVote(user *state.User, post *state.Post) *state.PostVote {
	up, down, none := string(state.VoteValueUp), string(state.VoteValueDown), string(state.VoteValueNone)
	vote_type := f.RandomStringElement([]string{up, up, up, up, up, up, up, up, down, down, none})

	user_id := user.ID
	post_id := post.ID

	if vote_type == up {
		up_vote_params := state.UpVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(queries.UpVotePost(ctx, up_vote_params))
		return &new_post_vote
	} else if vote_type == down {
		down_vote_params := state.DownVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(queries.DownVotePost(ctx, down_vote_params))
		return &new_post_vote
	} else if vote_type == none {
		none_vote_params := state.NoneVotePostParams{PostID: post_id, UserID: user_id}
		new_post_vote := lo.Must1(queries.NoneVotePost(ctx, none_vote_params))
		return &new_post_vote
	} else {
		panic("unreachable")
	}
}

func CreateFakeUser() *state.User {
	for attempt := 0; ; attempt++ {
		if attempt >= 1 {
			panic("Failed to create user, too many attempts")
		}

		username := fmt.Sprintf("%s%d", f.Person().FirstName(), f.IntBetween(100, 999))
		params := state.CreateUserParams{Username: username, Role: state.UserRoleUser}
		new_user, err := queries.CreateUser(ctx, params)

		if err == nil {
			return &new_user
		}
	}
}

func CreateFakePost(author *state.User) *state.Post {
	new_post_params := state.CreatePostParams{
		Title:    f.Lorem().Sentence(5),
		Url:      f.Internet().URL(),
		AuthorID: author.ID,
	}

	new_post := lo.Must1(queries.CreatePost(ctx, new_post_params))

	return &new_post
}
