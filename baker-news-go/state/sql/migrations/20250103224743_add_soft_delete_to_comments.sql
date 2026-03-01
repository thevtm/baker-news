-- +goose Up
-- +goose StatementBegin
ALTER TABLE comments
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE comments
  DROP COLUMN deleted_at;
-- +goose StatementEnd
