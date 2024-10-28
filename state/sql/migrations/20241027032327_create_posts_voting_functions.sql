-- +goose Up
--------------------------------------------------------------------------------
-- Create a function to update the score of a post
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_post_score_by(post_id BIGINT, score_change INT) RETURNS VOID AS $$
BEGIN
  UPDATE posts
    SET score = score + score_change
    WHERE posts.id = post_id;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd


--------------------------------------------------------------------------------
-- Create a function to up vote a post
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION up_vote_post(post_id BIGINT, user_id BIGINT) RETURNS post_votes AS $$
DECLARE
  p_post_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec post_votes;
BEGIN
  SELECT * INTO rec FROM post_votes
    WHERE post_votes.post_id = p_post_id AND post_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      RETURN rec;
    ELSIF rec.value = 'down' THEN
      PERFORM update_post_score_by(post_id, 2);
    ELSIF rec.value = 'none' THEN
      PERFORM update_post_score_by(post_id, 1);
    END IF;

    UPDATE post_votes SET value = 'up' WHERE post_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    PERFORM update_post_score_by(post_id, 1);
    INSERT INTO post_votes (post_id, user_id, value) VALUES (post_id, user_id, 'up') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

--------------------------------------------------------------------------------
-- Create a function to down vote a post
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION down_vote_post(post_id BIGINT, user_id BIGINT) RETURNS post_votes AS $$
DECLARE
  p_post_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec post_votes;
BEGIN
  SELECT * INTO rec FROM post_votes
    WHERE post_votes.post_id = p_post_id AND post_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      PERFORM update_post_score_by(post_id, -2);
    ELSIF rec.value = 'down' THEN
      RETURN rec;
    ELSIF rec.value = 'none' THEN
      PERFORM update_post_score_by(post_id, -1);
    END IF;

    UPDATE post_votes SET value = 'down' WHERE post_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    PERFORM update_post_score_by(post_id, -1);
    INSERT INTO post_votes (post_id, user_id, value) VALUES (post_id, user_id, 'down') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

--------------------------------------------------------------------------------
-- Create a function to none vote a post
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION none_vote_post(post_id BIGINT, user_id BIGINT) RETURNS post_votes AS $$
DECLARE
  p_post_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec post_votes;
BEGIN
  SELECT * INTO rec FROM post_votes
    WHERE post_votes.post_id = p_post_id AND post_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      PERFORM update_post_score_by(post_id, -1);
    ELSIF rec.value = 'down' THEN
      PERFORM update_post_score_by(post_id, 1);
    ELSIF rec.value = 'none' THEN
      RETURN rec;
    END IF;

    UPDATE post_votes SET value = 'none' WHERE post_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    INSERT INTO post_votes (post_id, user_id, value) VALUES (post_id, user_id, 'none') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION update_post_score_by;
DROP FUNCTION up_vote_post;
DROP FUNCTION down_vote_post;
DROP FUNCTION none_vote_post;
-- +goose StatementEnd
