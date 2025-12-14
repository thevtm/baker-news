-- +goose Up
-- +goose StatementBegin
ALTER TABLE comments
  ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE comments
  DROP COLUMN created_at;
-- +goose StatementEnd
