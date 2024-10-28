-- +goose Up

--------------------------------------------------------------------------------
-- Create a function to update the score of a comment
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_comment_score_by(comment_id BIGINT, score_change INT) RETURNS VOID AS $$
BEGIN
  UPDATE comments
    SET score = score + score_change
    WHERE comments.id = comment_id;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd


--------------------------------------------------------------------------------
-- Create a function to up vote a comment
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION up_vote_comment(comment_id BIGINT, user_id BIGINT) RETURNS comment_votes AS $$
DECLARE
  p_comment_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec comment_votes;
BEGIN
  SELECT * INTO rec FROM comment_votes
    WHERE comment_votes.comment_id = p_comment_id AND comment_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      RETURN rec;
    ELSIF rec.value = 'down' THEN
      PERFORM update_comment_score_by(comment_id, 2);
    ELSIF rec.value = 'none' THEN
      PERFORM update_comment_score_by(comment_id, 1);
    END IF;

    UPDATE comment_votes SET value = 'up' WHERE comment_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    PERFORM update_comment_score_by(comment_id, 1);
    INSERT INTO comment_votes (comment_id, user_id, value) VALUES (comment_id, user_id, 'up') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

--------------------------------------------------------------------------------
-- Create a function to down vote a comment
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION down_vote_comment(comment_id BIGINT, user_id BIGINT) RETURNS comment_votes AS $$
DECLARE
  p_comment_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec comment_votes;
BEGIN
  SELECT * INTO rec FROM comment_votes
    WHERE comment_votes.comment_id = p_comment_id AND comment_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      PERFORM update_comment_score_by(comment_id, -2);
    ELSIF rec.value = 'down' THEN
      RETURN rec;
    ELSIF rec.value = 'none' THEN
      PERFORM update_comment_score_by(comment_id, -1);
    END IF;

    UPDATE comment_votes SET value = 'down' WHERE comment_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    PERFORM update_comment_score_by(comment_id, -1);
    INSERT INTO comment_votes (comment_id, user_id, value) VALUES (comment_id, user_id, 'down') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

--------------------------------------------------------------------------------
-- Create a function to none vote a comment
--------------------------------------------------------------------------------
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION none_vote_comment(comment_id BIGINT, user_id BIGINT) RETURNS comment_votes AS $$
DECLARE
  p_comment_id ALIAS FOR $1;
  p_user_id ALIAS FOR $2;
  rec comment_votes;
BEGIN
  SELECT * INTO rec FROM comment_votes
    WHERE comment_votes.comment_id = p_comment_id AND comment_votes.user_id = p_user_id;

  IF rec IS NOT NULL THEN

    IF rec.value = 'up' THEN
      PERFORM update_comment_score_by(comment_id, -1);
    ELSIF rec.value = 'down' THEN
      PERFORM update_comment_score_by(comment_id, 1);
    ELSIF rec.value = 'none' THEN
      RETURN rec;
    END IF;

    UPDATE comment_votes SET value = 'none' WHERE comment_votes.id = rec.id RETURNING * INTO rec;

  ELSE
    INSERT INTO comment_votes (comment_id, user_id, value) VALUES (comment_id, user_id, 'none') RETURNING * INTO rec;

  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION update_comment_score_by;
DROP FUNCTION up_vote_comment;
DROP FUNCTION down_vote_comment;
DROP FUNCTION none_vote_comment;
-- +goose StatementEnd
