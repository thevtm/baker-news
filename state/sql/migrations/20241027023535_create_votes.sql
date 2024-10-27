-- +goose Up
-- +goose StatementBegin
CREATE TYPE vote_value AS ENUM ('up', 'down', 'none');

--- Post votes
CREATE TABLE post_votes (
  id             BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  post_id        BIGINT NOT NULL,
  user_id        BIGINT NOT NULL,
  value          vote_value NOT NULL,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (post_id, user_id),

  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX post_votes_user_id_idx ON post_votes(user_id);

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON post_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();

--- Comment votes
CREATE TABLE comment_votes (
  id             BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  comment_id     BIGINT NOT NULL,
  user_id        BIGINT NOT NULL,
  value          vote_value NOT NULL,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (comment_id, user_id),

  FOREIGN KEY (comment_id) REFERENCES comments(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX comment_votes_user_id_idx ON comment_votes(user_id);

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON comment_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE post_votes;
DROP TABLE comment_votes;
DROP TYPE vote_value;
-- +goose StatementEnd
