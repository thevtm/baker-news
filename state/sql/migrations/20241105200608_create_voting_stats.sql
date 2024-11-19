-- +goose Up
-- +goose StatementBegin
CREATE TABLE voting_stats (
  interval TIMESTAMP PRIMARY KEY,
  votes_count INT NOT NULL DEFAULT 0,

  db_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_db_updated_at
  BEFORE UPDATE ON voting_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_db_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER set_db_updated_at ON voting_stats;
DROP TABLE voting_stats;
-- +goose StatementEnd
