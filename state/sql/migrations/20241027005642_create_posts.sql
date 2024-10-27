-- +goose Up
-- +goose StatementBegin
CREATE TABLE posts (
  id             BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  url            TEXT NOT NULL,
  author_id      BIGINT NOT NULL,
  votes          INT NOT NULL,
  comments_count INT NOT NULL,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE posts;
-- +goose StatementEnd
