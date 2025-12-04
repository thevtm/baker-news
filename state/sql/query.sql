--------------------------------------------------------------------------------
-- User Queries
--------------------------------------------------------------------------------

-- name: GetUser :one
SELECT * FROM users
  WHERE id = $1 LIMIT 1;

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

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;


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
DELETE FROM posts
  WHERE id = $1;

-- name: TopPosts :many
SELECT * FROM posts
  ORDER BY score DESC
  LIMIT $1;

-- name: LatestPosts :many
SELECT * FROM posts
  ORDER BY created_at DESC
  LIMIT $1;


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
    post_id, author_id, content, score
  ) VALUES (
    $1, $2, $3, 1
  )
  RETURNING *;

-- name: DeleteComment :exec
WITH updated_posts AS (
  UPDATE posts
    SET comments_count = comments_count - 1
    WHERE id = (SELECT post_id FROM comments WHERE id = $1)
)
DELETE FROM comments
  WHERE comments.id = $1;

-- name: CommentsForPost :many
SELECT * FROM comments
  WHERE post_id = $1;

-- name: UpdateCommentContent :exec
UPDATE comments
  SET content = $2
  WHERE id = $1;


--------------------------------------------------------------------------------
-- Votes Queries
--------------------------------------------------------------------------------

-- name: UpVotePost :one
SELECT * FROM up_vote_post($1, $2);

-- name: DownVotePost :one
SELECT * FROM down_vote_post($1, $2);

-- name: NoneVotePost :one
SELECT * FROM none_vote_post($1, $2);

