-- +goose Up
-- +goose StatementBegin
CREATE TABLE comments (
  id                BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  post_id           BIGINT NOT NULL,
  author_id         BIGINT NOT NULL,
  parent_comment_id BIGINT,
  content           TEXT NOT NULL,
  score             INT NOT NULL,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
);

CREATE INDEX comments_post_id_idx ON comments(post_id);
CREATE INDEX comments_author_id_idx ON comments(author_id);

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE comments;
-- +goose StatementEnd
