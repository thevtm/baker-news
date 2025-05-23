-- +goose Up
-- +goose StatementBegin
CREATE TYPE user_role AS ENUM ('system', 'admin', 'user', 'guest');

CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY NOT NULL UNIQUE,
  username   VARCHAR(20) NOT NULL UNIQUE,
  role       user_role NOT NULL,

  db_created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  db_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX unique_username_lower ON users (LOWER(username));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE users;
DROP TYPE user_role;
-- +goose StatementEnd
