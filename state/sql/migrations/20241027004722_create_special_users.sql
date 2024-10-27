-- +goose Up
-- +goose StatementBegin

-- Create special users
INSERT INTO users (id, username, role) VALUES (0, 'SYSTEM', 'system');
INSERT INTO users (id, username, role) VALUES (1, 'Admin', 'admin');
INSERT INTO users (id, username, role) VALUES (2, 'Guest', 'guest');

-- Reserve the first 1000 IDs for system use
ALTER SEQUENCE users_id_seq RESTART WITH 1000;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM users WHERE id = 0;
DELETE FROM users WHERE id = 1;
DELETE FROM users WHERE id = 2;

ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- +goose StatementEnd
