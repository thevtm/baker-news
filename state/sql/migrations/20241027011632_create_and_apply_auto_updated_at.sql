-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_db_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.db_updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER set_db_updated_at ON users;
DROP TRIGGER set_db_updated_at ON posts;

DROP FUNCTION update_db_updated_at_column;
-- +goose StatementEnd
