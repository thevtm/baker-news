package app

import (
	"net/http"

	"github.com/thevtm/baker-news/app/post_comments"
	"github.com/thevtm/baker-news/app/posts"
	signin "github.com/thevtm/baker-news/app/sign_in"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type App struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

func NewApp(queries *state.Queries, commands *commands.Commands) *App {
	return &App{Queries: queries, Commands: commands}
}

func (a *App) MakeServer() *http.ServeMux {
	request_id_inc := 0
	mux := http.NewServeMux()

	// Post List
	var posts_handler http.Handler = posts.NewTopPosts(a.Queries)
	posts_handler = NewLoggingMiddleware(posts_handler)
	posts_handler = signin.NewAuthMiddlewareHandler(posts_handler, a.Queries)
	posts_handler = NewRequestIDMiddleware(posts_handler, &request_id_inc)

	mux.Handle("GET /", posts_handler)
	mux.Handle("GET /top", posts_handler)

	// Post Vote
	var post_vote_handler http.Handler = posts.NewPostListVoteHandler(a.Commands)
	post_vote_handler = NewLoggingMiddleware(post_vote_handler)
	post_vote_handler = signin.NewAuthMiddlewareHandler(post_vote_handler, a.Queries)
	post_vote_handler = NewRequestIDMiddleware(post_vote_handler, &request_id_inc)

	mux.Handle("POST /", post_vote_handler)
	mux.Handle("POST /top", post_vote_handler)

	// Post Comments
	var post_comments_handler http.Handler = post_comments.NewPostCommentsHandler(a.Queries)
	post_comments_handler = NewLoggingMiddleware(post_comments_handler)
	post_comments_handler = signin.NewAuthMiddlewareHandler(post_comments_handler, a.Queries)
	post_comments_handler = NewRequestIDMiddleware(post_comments_handler, &request_id_inc)

	mux.Handle("GET /post/{post_id}", post_comments_handler)

	// Sign In
	var sign_in_handler http.Handler = signin.NewUserSignInHandler(a.Queries)
	sign_in_handler = NewLoggingMiddleware(sign_in_handler)
	sign_in_handler = signin.NewAuthMiddlewareHandler(sign_in_handler, a.Queries)
	sign_in_handler = NewRequestIDMiddleware(sign_in_handler, &request_id_inc)

	mux.Handle("GET /sign-in", sign_in_handler)

	// Sign In Submit
	var sign_in_submit_handler http.Handler = signin.NewUserSignInSubmitHandler(a.Queries, a.Commands)
	sign_in_submit_handler = NewLoggingMiddleware(sign_in_submit_handler)
	sign_in_submit_handler = signin.NewAuthMiddlewareHandler(sign_in_submit_handler, a.Queries)
	sign_in_submit_handler = NewRequestIDMiddleware(sign_in_submit_handler, &request_id_inc)

	mux.Handle("POST /sign-in", sign_in_submit_handler)

	// Sign Out
	var sign_out_handler http.Handler = signin.NewUserSignOutHandler(a.Queries)
	sign_out_handler = NewLoggingMiddleware(sign_out_handler)
	sign_out_handler = signin.NewAuthMiddlewareHandler(sign_out_handler, a.Queries)
	sign_out_handler = NewRequestIDMiddleware(sign_out_handler, &request_id_inc)

	mux.Handle("GET /sign-out", sign_out_handler)
	mux.Handle("POST /sign-out", sign_out_handler)

	return mux
}
