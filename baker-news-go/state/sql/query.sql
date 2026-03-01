--------------------------------------------------------------------------------
-- User Queries
--------------------------------------------------------------------------------

-- name: GetUserByID :one
SELECT * FROM users
  WHERE id = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users
  WHERE LOWER(username) = LOWER($1)
  LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
  ORDER BY id;

-- name: CreateUser :one
INSERT INTO users (
  username, role
) VALUES (
  $1, $2
)
RETURNING *;

-- name: IsUsernameTaken :one
SELECT EXISTS (
  SELECT 1 FROM users
    WHERE LOWER(username) = LOWER($1)
);


--------------------------------------------------------------------------------
-- Post Queries
--------------------------------------------------------------------------------

-- name: GetPost :one
SELECT * FROM posts
  WHERE id = $1 LIMIT 1;

-- name: CreatePost :one
INSERT INTO posts (
    title, url, author_id, score, comments_count
  ) VALUES (
    $1, $2, $3, 1, 0
  )
  RETURNING *;

-- name: DeletePost :exec
UPDATE posts
  SET deleted_at = NOW()
  WHERE id = $1;

-- name: TopPosts :many
SELECT * FROM posts
  ORDER BY score DESC
  LIMIT $1;

-- name: LatestPosts :many
SELECT * FROM posts
  ORDER BY created_at DESC
  LIMIT $1;

-- name: PostWithAuthor :one
SELECT sqlc.embed(posts), sqlc.embed(author) FROM posts
  JOIN users author ON posts.author_id = author.id
  WHERE posts.id = @post_id;

-- name: GetPostWithAuthorAndUserVote :one
SELECT sqlc.embed(posts), sqlc.embed(author), post_votes.value AS vote_value FROM posts
  JOIN users author ON posts.author_id = author.id
  LEFT JOIN post_votes ON posts.id = post_votes.post_id AND post_votes.user_id = @user_id
  WHERE posts.id = @post_id;

-- TODO: Look into performance of this query, maybe add a multicolumn index
-- TODO: I ran into a bug where using `sqlc.embed` with a `LEFT JOIN` didn't work as expected (https://github.com/sqlc-dev/sqlc/issues/3269)
-- name: TopPostsWithAuthorAndVotesForUser :many
SELECT sqlc.embed(posts), sqlc.embed(author), post_votes.value AS vote_value FROM posts
  JOIN users author ON posts.author_id = author.id
  LEFT JOIN post_votes ON posts.id = post_votes.post_id AND post_votes.user_id = $1
  WHERE posts.deleted_at IS NULL
  ORDER BY score DESC
  LIMIT $2;

--------------------------------------------------------------------------------
-- Comment Queries
--------------------------------------------------------------------------------

-- name: GetComment :one
SELECT * FROM comments
  WHERE id = $1 LIMIT 1;

-- name: CreateComment :one
WITH updated_posts AS (
  UPDATE posts
    SET comments_count = comments_count + 1
    WHERE id = $1
    RETURNING id
)
INSERT INTO comments (
    post_id, author_id, parent_comment_id, content, score
  ) VALUES (
    $1, $2, $3, $4, 1
  )
  RETURNING *;

-- name: DeleteComment :exec
WITH updated_posts AS (
  UPDATE posts
    SET comments_count = comments_count - 1
    WHERE id = (SELECT post_id FROM comments WHERE id = $1)
)
UPDATE comments
  SET deleted_at = NOW()
  WHERE comments.id = $1;

-- name: CommentsForPost :many
SELECT * FROM comments
  WHERE post_id = $1;

-- name: UpdateCommentContent :exec
UPDATE comments
  SET content = $2
  WHERE id = $1;

-- name: CommentWithAuthor :one
SELECT sqlc.embed(comments), sqlc.embed(author) FROM comments
  JOIN users author ON comments.author_id = author.id
  WHERE comments.id = $1;

-- name: CommentsForPostWithAuthorAndVotesForUser :many
SELECT sqlc.embed(comments), sqlc.embed(author), comment_votes.value AS vote_value FROM comments
  JOIN users author ON comments.author_id = author.id
  LEFT JOIN comment_votes ON comments.id = comment_votes.comment_id AND comment_votes.user_id = $1
  WHERE comments.post_id = $2 AND comments.deleted_at IS NULL
  ORDER BY comments.id ASC;


--------------------------------------------------------------------------------
-- Votes Queries
--------------------------------------------------------------------------------

-- name: UpVotePost :one
SELECT * FROM up_vote_post($1, $2);

-- name: DownVotePost :one
SELECT * FROM down_vote_post($1, $2);

-- name: NoneVotePost :one
SELECT * FROM none_vote_post($1, $2);

-- name: UpVoteComment :one
SELECT * FROM up_vote_comment($1, $2);

-- name: DownVoteComment :one
SELECT * FROM down_vote_comment($1, $2);

-- name: NoneVoteComment :one
SELECT * FROM none_vote_comment($1, $2);

--------------------------------------------------------------------------------
-- Vote Counts Aggregate Queries
--------------------------------------------------------------------------------

-- name: GetVoteCountsAggregateByInterval :one
SELECT * FROM vote_counts_aggregate
  WHERE interval = $1
  LIMIT 1;

-- name: IncrementVoteCountsAggregateUpVote :exec
INSERT INTO vote_counts_aggregate (interval, post_up_vote_count)
  VALUES ($1, 1)
  ON CONFLICT (interval) DO UPDATE
    SET post_up_vote_count = vote_counts_aggregate.post_up_vote_count + 1;

-- name: IncrementVoteCountsAggregateDownVote :exec
INSERT INTO vote_counts_aggregate (interval, post_down_vote_count)
  VALUES ($1, 1)
  ON CONFLICT (interval) DO UPDATE
    SET post_down_vote_count = vote_counts_aggregate.post_down_vote_count + 1;

-- name: IncrementVoteCountsAggregateNoneVote :exec
INSERT INTO vote_counts_aggregate (interval, post_none_vote_count)
  VALUES ($1, 1)
  ON CONFLICT (interval) DO UPDATE
    SET post_none_vote_count = vote_counts_aggregate.post_none_vote_count + 1;
