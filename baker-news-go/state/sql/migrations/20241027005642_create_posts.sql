-- +goose Up
-- +goose StatementBegin
CREATE TABLE posts (
  id             BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  url            TEXT NOT NULL,
  author_id      BIGINT NOT NULL,
  score          INT NOT NULL,
  comments_count INT NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX posts_author_id_idx ON posts(author_id);
CREATE INDEX posts_created_at_desc_idx ON posts (created_at DESC);
CREATE INDEX posts_score_desc_idx ON posts (score DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE posts;
-- +goose StatementEnd
