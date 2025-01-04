-- +goose Up
-- +goose StatementBegin
ALTER TABLE posts
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE posts
  DROP COLUMN deleted_at;
-- +goose StatementEnd
