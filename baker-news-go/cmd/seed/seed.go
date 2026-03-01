package main

import (
	"context"
	"flag"
	"fmt"
	"math/rand/v2"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jaswdr/faker/v2"
	"github.com/negrel/assert"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/state"
	"github.com/thevtm/baker-news/state/seed"
)

func main() {
	fmt.Printf("Seeding database...\n")

	// 0. Parse params
	db_uri, command_nil_found := os.LookupEnv("DATABASE_URI")
	if !command_nil_found {
		panic("DATABASE_URI env var is not set")
	}

	num_users := flag.Int("num_users", 100, "Number of users to seed")
	num_posts := flag.Int("num_posts", 10, "Number of posts to seed")
	num_post_votes := flag.Int("num_post_votes", 200, "Number of post votes to seed")
	num_root_comments := flag.Int("num_root_comments", 10, "Number of root comments to seed")
	num_child_comments := flag.Int("num_child_comments", 10, "Number of child comments to seed")
	num_comment_votes := flag.Int("num_comment_votes", 100, "Number of comment votes to seed")
	interval_between_commands := flag.Duration("interval_between_commands", time.Millisecond*250, "Interval between commands in milliseconds")
	flag.Parse()

	fmt.Printf("Seeding %d users, %d posts, %d post votes\n", *num_users, *num_posts, *num_post_votes)
	fmt.Println("")

	// 1. Setup
	ctx := context.Background()

	conn := lo.Must1(pgx.Connect(ctx, db_uri))
	defer conn.Close(ctx)

	f := faker.New()
	queries := state.New(conn)
	seeder := seed.CreateSeeder(queries, &f)

	// tx := lo.Must(conn.Begin(ctx))
	// defer tx.Rollback(ctx)

	new_users := make([]*state.User, 0)
	new_posts := make([]*state.Post, 0)
	new_comments := make([]*state.Comment, 0)

	// 2. Commands
	create_fake_user_command := func() {
		new_user := seeder.CreateFakeUser(ctx)
		new_users = append(new_users, new_user)
		fmt.Printf("Created user: %v\n", new_user)
	}

	create_fake_post_command := func() {
		author := new_users[f.IntBetween(0, len(new_users)-1)]
		new_post := seeder.CreateFakePost(ctx, author)
		new_posts = append(new_posts, new_post)
		fmt.Printf("Created post: %v\n", new_post)
	}

	create_fake_post_vote_command := func() {
		post := new_posts[f.IntBetween(0, len(new_posts)-1)]
		user := new_users[f.IntBetween(0, len(new_users)-1)]
		new_post_vote := seeder.CreateFakePostVote(ctx, user, post)
		fmt.Printf("Created post vote: %v\n", new_post_vote)
	}

	create_fake_root_comment_command := func() {
		author := new_users[f.IntBetween(0, len(new_users)-1)]
		post := new_posts[f.IntBetween(0, len(new_posts)-1)]
		new_root_comment := seeder.CreateFakeRootComment(ctx, author, post)
		new_comments = append(new_comments, new_root_comment)
		fmt.Printf("Created root comment: %v\n", new_root_comment)
	}

	create_fake_child_comment_command := func() {
		author := new_users[f.IntBetween(0, len(new_users)-1)]
		parent := new_comments[f.IntBetween(0, len(new_comments)-1)]
		new_child_comment := seeder.CreateFakeChildComment(ctx, author, parent)
		new_comments = append(new_comments, new_child_comment)
		fmt.Printf("Created child comment: %v\n", new_child_comment)
	}

	create_fake_comment_vote_command := func() {
		comment := new_comments[f.IntBetween(0, len(new_comments)-1)]
		user := new_users[f.IntBetween(0, len(new_users)-1)]
		new_comment_vote := seeder.CreateFakeCommentVote(ctx, user, comment)
		fmt.Printf("Created comment vote: %v\n", new_comment_vote)
	}

	// 3. Commands List
	commands_index := 0
	total_commands := *num_users + *num_posts + *num_post_votes + *num_root_comments + *num_child_comments + *num_comment_votes
	commands := make([]*func(), total_commands)

	// First 3 commands must be users, posts, and root comments
	// because the rest of the commands depend on them existing
	commands[commands_index] = &create_fake_user_command
	commands_index++

	commands[commands_index] = &create_fake_post_command
	commands_index++

	commands[commands_index] = &create_fake_root_comment_command
	commands_index++

	for i := 0; i < *num_users-1; i++ {
		commands[commands_index] = &create_fake_user_command
		commands_index++
	}

	for i := 0; i < *num_posts-1; i++ {
		commands[commands_index] = &create_fake_post_command
		commands_index++
	}

	for i := 0; i < *num_post_votes; i++ {
		commands[commands_index] = &create_fake_post_vote_command
		commands_index++
	}

	for i := 0; i < *num_root_comments-1; i++ {
		commands[commands_index] = &create_fake_root_comment_command
		commands_index++
	}

	for i := 0; i < *num_child_comments; i++ {
		commands[commands_index] = &create_fake_child_comment_command
		commands_index++
	}

	for i := 0; i < *num_comment_votes; i++ {
		commands[commands_index] = &create_fake_comment_vote_command
		commands_index++
	}

	_, first_command_nil_index, command_nil_found := lo.FindIndexOf(commands, func(cmd *func()) bool { return cmd == nil })
	assert.False(command_nil_found, "Command is nil at index %d", first_command_nil_index)

	// Execute commands
	rand.Shuffle(len(commands), func(i, j int) {
		// The first 3 commands must not be shuffled
		if i <= 2 || j <= 2 {
			return
		}

		commands[i], commands[j] = commands[j], commands[i]
	})

	assert.True(commands[0] == &create_fake_user_command, "First command is not create_fake_user_command")
	assert.True(commands[1] == &create_fake_post_command, "Second command is not create_fake_post_command")
	assert.True(commands[2] == &create_fake_root_comment_command, "Third command is not create_fake_root_comment_command")

	for i, command := range commands {
		(*command)()
		fmt.Printf("Progress: %d/%d\n", i+1, total_commands)
		time.Sleep(*interval_between_commands)
	}

	fmt.Println("")

	// tx.Commit(ctx)

	fmt.Println("Database seeded.")
}
