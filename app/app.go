package app

import (
	"io"
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/post_block"
	"github.com/thevtm/baker-news/app/post_comments_page"
	"github.com/thevtm/baker-news/app/top_posts_page"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/events"
	"github.com/thevtm/baker-news/state"
)

type App struct {
	Queries  *state.Queries
	Commands *commands.Commands
	Events   *events.Events
}

func New(queries *state.Queries, commands *commands.Commands, events *events.Events) *App {
	return &App{Queries: queries, Commands: commands, Events: events}
}

func (a *App) MakeServer() *http.ServeMux {
	request_id_inc := 0
	mux := http.NewServeMux()

	// Post List
	var posts_handler http.Handler = top_posts_page.NewTopPosts(a.Queries)
	posts_handler = NewLoggingMiddleware(posts_handler)
	posts_handler = auth.NewAuthMiddlewareHandler(posts_handler, a.Queries)
	posts_handler = NewRequestIDMiddleware(posts_handler, &request_id_inc)

	mux.Handle("GET /", posts_handler)
	mux.Handle("GET /top", posts_handler)

	// Post Vote
	var post_vote_handler http.Handler = post_block.NewPostListVoteHandler(a.Queries, a.Commands)
	post_vote_handler = NewLoggingMiddleware(post_vote_handler)
	post_vote_handler = auth.NewAuthMiddlewareHandler(post_vote_handler, a.Queries)
	post_vote_handler = NewRequestIDMiddleware(post_vote_handler, &request_id_inc)

	mux.Handle("POST /post/vote", post_vote_handler)

	// Post Comments
	var post_comments_handler http.Handler = post_comments_page.NewPostCommentsHandler(a.Queries)
	post_comments_handler = NewLoggingMiddleware(post_comments_handler)
	post_comments_handler = auth.NewAuthMiddlewareHandler(post_comments_handler, a.Queries)
	post_comments_handler = NewRequestIDMiddleware(post_comments_handler, &request_id_inc)

	mux.Handle("GET /post/{post_id}", post_comments_handler)

	// Post Comment Vote
	var post_comment_vote_handler http.Handler = post_comments_page.NewPostCommentVoteHandler(a.Queries, a.Commands)
	post_comment_vote_handler = NewLoggingMiddleware(post_comment_vote_handler)
	post_comment_vote_handler = auth.NewAuthMiddlewareHandler(post_comment_vote_handler, a.Queries)
	post_comment_vote_handler = NewRequestIDMiddleware(post_comment_vote_handler, &request_id_inc)

	mux.Handle("POST /post/comment/vote", post_comment_vote_handler)

	// Post Comment Add
	var post_comment_add_handler http.Handler = post_comments_page.NewPostCommentAddHandler(a.Queries, a.Commands)
	post_comment_add_handler = NewLoggingMiddleware(post_comment_add_handler)
	post_comment_add_handler = auth.NewAuthMiddlewareHandler(post_comment_add_handler, a.Queries)
	post_comment_add_handler = NewRequestIDMiddleware(post_comment_add_handler, &request_id_inc)

	mux.Handle("POST /post/comment/add", post_comment_add_handler)

	// Sign In
	var sign_in_handler http.Handler = auth.NewUserSignInHandler(a.Queries)
	sign_in_handler = NewLoggingMiddleware(sign_in_handler)
	sign_in_handler = auth.NewAuthMiddlewareHandler(sign_in_handler, a.Queries)
	sign_in_handler = NewRequestIDMiddleware(sign_in_handler, &request_id_inc)

	mux.Handle("GET /sign-in", sign_in_handler)

	// Sign In Submit
	var sign_in_submit_handler http.Handler = auth.NewUserSignInSubmitHandler(a.Queries, a.Commands)
	sign_in_submit_handler = NewLoggingMiddleware(sign_in_submit_handler)
	sign_in_submit_handler = auth.NewAuthMiddlewareHandler(sign_in_submit_handler, a.Queries)
	sign_in_submit_handler = NewRequestIDMiddleware(sign_in_submit_handler, &request_id_inc)

	mux.Handle("POST /sign-in", sign_in_submit_handler)

	// Sign Out
	var sign_out_handler http.Handler = auth.NewUserSignOutHandler(a.Queries)
	sign_out_handler = NewLoggingMiddleware(sign_out_handler)
	sign_out_handler = auth.NewAuthMiddlewareHandler(sign_out_handler, a.Queries)
	sign_out_handler = NewRequestIDMiddleware(sign_out_handler, &request_id_inc)

	mux.Handle("GET /sign-out", sign_out_handler)
	mux.Handle("POST /sign-out", sign_out_handler)

	// Foobar
	mux.HandleFunc("POST /dapr/pubsub/user-voted-event", func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)

		if err != nil {
			slog.Error("failed to read body", slog.Any("error", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		slog.Info("received event endpoint", slog.Any("body", string(body)))

		w.WriteHeader(http.StatusOK)
	})

	return mux
}
