package web_console

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/commands"
	"github.com/thevtm/baker-news/state"
)

type ConsoleHandler struct {
	Queries  *state.Queries
	Commands *commands.Commands
}

type WebConsoleBody struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

const (
	WebConsoleCommandUserSignUp        = "user_sign_up"
	WebConsoleCommandUserSubmitPost    = "user_submit_post"
	WebConsoleCommandUserVotePost      = "user_vote_post"
	WebConsoleCommandUserVoteComment   = "user_vote_comment"
)

type UserSignUpWebConsoleCommand struct {
	Username string `json:"username"`
}

type UserSubmitPostWebConsoleCommand struct {
	UserID int    `json:"user_id"`
	Title  string `json:"title"`
	URL    string `json:"url"`
}

type UserSubmitCommentWebConsoleCommand struct {
	UserID int    `json:"user_id"`
	Title  string `json:"title"`
	URL    string `json:"url"`
}

func NewWebConsoleHandler(queries *state.Queries, commands *commands.Commands) *ConsoleHandler {
	return &ConsoleHandler{Queries: queries, Commands: commands}
}

func (p *ConsoleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, commands, queries := r.Context(), p.Commands, p.Queries

	user := auth.GetAuthContext(ctx).User

	// 1. Redirect to sign in if user is guest
	if !user.IsAdmin() {
		slog.InfoContext(ctx, "User is not an admin")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Parse body
	web_console_body := WebConsoleBody{}
	if err := json.NewDecoder(r.Body).Decode(&web_console_body); err != nil {
		slog.ErrorContext(ctx, "Failed to decode request body", slog.Any("error", err))
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}

	// 3. Handle User Sign Up Web Console Command
	if web_console_body.Type == WebConsoleCommandUserSignUp {
		slog.InfoContext(ctx, "Handling User Sign Up Console Command")

		// Parse command
		command := UserSignUpWebConsoleCommand{}
		if err := json.Unmarshal(web_console_body.Data, &command); err != nil {
			slog.ErrorContext(ctx, "Failed to decode User Sign Up Command", slog.Any("error", err))
			http.Error(w, "Invalid Request", http.StatusBadRequest)
			return
		}

		// Execute command
		new_user, err := commands.UserSignUp(ctx, command.Username)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to create user", slog.Any("error", err))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Respond
		new_user_json, err := json.Marshal(new_user)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to marshal user", slog.Any("error", err))
			http.Error(w, "Failed to execute Web Console command User Sign Up Command", http.StatusInternalServerError)
			return
		}

		w.Write(new_user_json)
		return
	}

	// 4. Handle User Submit Post Web Console Command
	if web_console_body.Type == WebConsoleCommandUserSubmitPost {
		slog.InfoContext(ctx, "Handling User Submit Post Web Console Command")

		// Parse command
		command := UserSubmitPostWebConsoleCommand{}
		if err := json.Unmarshal(web_console_body.Data, &command); err != nil {
			slog.ErrorContext(ctx, "Failed to decode User Submit Post Command", slog.Any("error", err))
			http.Error(w, "Invalid Request", http.StatusBadRequest)
			return
		}

		// Execute command
		post_author, err := queries.GetUserByID(ctx, int64(command.UserID))
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get user by ID", slog.Any("error", err))
			http.Error(w, "User not found", http.StatusInternalServerError)
			return
		}

		new_post, err := commands.UserSubmitPost(ctx, &post_author, command.Title, command.URL)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to create post", slog.Any("error", err))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Respond
		new_post_json, err := json.Marshal(new_post)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to marshal post", slog.Any("error", err))
			http.Error(w, "Failed to execute User Submit Post Web Console Command", http.StatusInternalServerError)
			return
		}

		w.Write(new_post_json)
		return
	}

	// Unknown command
	slog.ErrorContext(ctx, "Unknown Web Console Command", slog.String("type", web_console_body.Type))
	http.Error(w, "Unknown Command", http.StatusBadRequest)
}
