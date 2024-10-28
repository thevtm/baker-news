package main

import (
	"context"
	"flag"
	"fmt"
	"math/rand/v2"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jaswdr/faker/v2"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/state"
	"github.com/thevtm/baker-news/state/seed"
)

func main() {
	fmt.Printf("Seeding database...\n")

	// 0. Parse params
	db_uri, ok := os.LookupEnv("DATABASE_URI")
	if !ok {
		panic("DATABASE_URI env var is not set")
	}

	num_users := flag.Int("num_users", 100, "Number of users to seed")
	num_posts := flag.Int("num_posts", 10, "Number of posts to seed")
	num_post_votes := flag.Int("num_post_votes", 200, "Number of post votes to seed")
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

	tx := lo.Must(conn.Begin(ctx))
	defer tx.Rollback(ctx)

	new_users := make([]*state.User, 0)
	new_posts := make([]*state.Post, 0)
	commands := make([]func(), 0)

	// 2. Create initial records
	create_fake_user_command := func() func() {
		return func() {
			new_user := seeder.CreateFakeUser(ctx)
			new_users = append(new_users, new_user)
			fmt.Printf("Created user: %v\n", new_user)
		}
	}

	create_fake_post_command := func() func() {
		return func() {
			author := new_users[f.IntBetween(0, len(new_users)-1)]
			new_post := seeder.CreateFakePost(ctx, author)
			new_posts = append(new_posts, new_post)
			fmt.Printf("Created post: %v\n", new_post)
		}
	}

	create_fake_user_command()()
	*num_users--

	create_fake_post_command()()
	*num_posts--

	// 2. Create Users Command
	for i := 0; i < *num_users; i++ {
		commands = append(commands, create_fake_user_command())
	}

	// 3. Create Posts Command
	for i := 0; i < *num_posts; i++ {
		commands = append(commands, create_fake_post_command())
	}

	// 4. Create Post Votes Command
	for i := 0; i < *num_post_votes; i++ {
		commands = append(commands, func() {
			post := new_posts[f.IntBetween(0, len(new_posts)-1)]
			user := new_users[f.IntBetween(0, len(new_users)-1)]
			new_post_vote := seeder.CreateFakePostVote(ctx, user, post)
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

	fmt.Println("")

	tx.Commit(ctx)

	fmt.Println("Database seeded.")
}
