package post_comments_page

import (
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strconv"

	"github.com/negrel/assert"
	"github.com/samber/lo"
	"github.com/thevtm/baker-news/app/auth"
	"github.com/thevtm/baker-news/app/htmx"
	"github.com/thevtm/baker-news/state"
	"golang.org/x/exp/constraints"
)

func BuildPostCommentTree(comments_rows *[]state.CommentsForPostWithAuthorAndVotesForUserRow) []*PostCommentNode {
	roots := make([]*PostCommentNode, 0)
	node_map := make(map[int64]*PostCommentNode)

	// 1. Find root nodes (nodes are ordered by ID)
	for _, row := range *comments_rows {
		vote_value := lo.If(row.VoteValue.Valid, row.VoteValue.VoteValue).Else(state.VoteValueNone)

		node := NewPostCommentNode(&row.Comment, &row.User, vote_value)
		node_map[row.Comment.ID] = node

		if row.Comment.ParentCommentID.Valid {
			parent := node_map[row.Comment.ParentCommentID.Int64]
			assert.NotNil(parent, "Parent comment not found")
			parent.AddChild(node)
		} else {
			roots = append(roots, node)
		}
	}

	slices.SortFunc(roots, func(a, b *PostCommentNode) int {
		return -1 * Compare(a.Comment.Score, b.Comment.Score)
	})

	return roots
}

type PostCommentsHandler struct {
	Queries *state.Queries
}

func NewPostCommentsHandler(queries *state.Queries) *PostCommentsHandler {
	return &PostCommentsHandler{Queries: queries}
}

func (p *PostCommentsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, queries := r.Context(), p.Queries

	user := auth.GetAuthContext(ctx).User

	// 1. Parse request
	post_id_str := r.PathValue("post_id")

	slog.DebugContext(ctx, "Args received",
		slog.String("post_id", post_id_str),
	)

	post_id, err := strconv.ParseInt(post_id_str, 10, 64)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid post_id \"%s\"", post_id_str), http.StatusBadRequest)
		return
	}

	// 2. Retrieve post
	post_agg, err := queries.GetPostWithAuthorAndUserVote(ctx, state.GetPostWithAuthorAndUserVoteParams{
		PostID: post_id,
		UserID: user.ID,
	})

	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to retrieve Post",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	post := post_agg.Post
	author := post_agg.User
	post_user_vote := lo.If(post_agg.VoteValue.Valid, post_agg.VoteValue.VoteValue).Else(state.VoteValueNone)

	// 3. Retrieve comments_agg
	comments_agg, err := queries.CommentsForPostWithAuthorAndVotesForUser(ctx, state.CommentsForPostWithAuthorAndVotesForUserParams{
		PostID: post_id,
		UserID: user.ID,
	})

	if err != nil {
		slog.ErrorContext(r.Context(), "Failed to retrieve Comments",
			slog.Int64("post_id", post_id),
			slog.Any("error", err),
		)
		http.Error(w, "Comments not found", http.StatusNotFound)
		return
	}

	comments_nodes := BuildPostCommentTree(&comments_agg)
	slog.DebugContext(ctx, "Comments retrieved", slog.Int("roots_count", len(comments_nodes)))

	// 3. Render the page
	htmx_headers := htmx.ParseHTMXHeaders(r.Header)

	if htmx_headers.IsHTMXRequest() && htmx_headers.HXTarget == "main" {
		PostMain(&post, &author, post_user_vote, &comments_nodes).Render(r.Context(), w)
		return
	}

	PostPage(&user, &post, &author, post_user_vote, &comments_nodes).Render(r.Context(), w)
}

func Compare[T constraints.Ordered](a, b T) int {
	if a < b {
		return -1
	} else if a > b {
		return 1
	}

	return 0
}
