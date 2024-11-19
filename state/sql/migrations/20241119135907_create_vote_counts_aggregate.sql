-- +goose Up
-- +goose StatementBegin
CREATE TABLE vote_counts_aggregate (
    id SERIAL PRIMARY KEY,
    interval TIMESTAMP NOT NULL,

    post_up_vote_count INT NOT NULL DEFAULT 0,
    post_down_vote_count INT NOT NULL DEFAULT 0,
    post_none_vote_count INT NOT NULL DEFAULT 0,

    comment_up_vote_count INT NOT NULL DEFAULT 0,
    comment_down_vote_count INT NOT NULL DEFAULT 0,
    comment_none_vote_count INT NOT NULL DEFAULT 0,

    db_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    db_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_vote_counts_aggregate_interval ON vote_counts_aggregate (interval DESC);

CREATE TRIGGER set_db_updated_at
    BEFORE UPDATE ON vote_counts_aggregate
    FOR EACH ROW
    EXECUTE FUNCTION update_db_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE vote_counts_aggregate;
-- +goose StatementEnd
