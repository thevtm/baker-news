--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'system',
    'admin',
    'user',
    'guest'
);


--
-- Name: vote_value; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vote_value AS ENUM (
    'up',
    'down',
    'none'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_votes (
    id bigint NOT NULL,
    comment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    value public.vote_value NOT NULL,
    db_created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: down_vote_comment(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.down_vote_comment(comment_id bigint, user_id bigint) RETURNS public.comment_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: post_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_votes (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    value public.vote_value NOT NULL,
    db_created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: down_vote_post(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.down_vote_post(post_id bigint, user_id bigint) RETURNS public.post_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: none_vote_comment(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.none_vote_comment(comment_id bigint, user_id bigint) RETURNS public.comment_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: none_vote_post(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.none_vote_post(post_id bigint, user_id bigint) RETURNS public.post_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: up_vote_comment(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.up_vote_comment(comment_id bigint, user_id bigint) RETURNS public.comment_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: up_vote_post(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.up_vote_post(post_id bigint, user_id bigint) RETURNS public.post_votes
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: update_comment_score_by(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_score_by(comment_id bigint, score_change integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE comments
    SET score = score + score_change
    WHERE comments.id = comment_id;
END;
$$;


--
-- Name: update_db_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_db_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.db_updated_at = NOW();
        RETURN NEW;
    END;
    $$;


--
-- Name: update_post_score_by(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_post_score_by(post_id bigint, score_change integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE posts
    SET score = score + score_change
    WHERE posts.id = post_id;
END;
$$;


--
-- Name: comment_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comment_votes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comment_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comment_votes_id_seq OWNED BY public.comment_votes.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    author_id bigint NOT NULL,
    parent_comment_id bigint,
    content text NOT NULL,
    score integer NOT NULL,
    db_created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: post_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_votes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_votes_id_seq OWNED BY public.post_votes.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    author_id bigint NOT NULL,
    score integer NOT NULL,
    comments_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(20) NOT NULL,
    role public.user_role NOT NULL,
    db_created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vote_counts_aggregate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vote_counts_aggregate (
    id integer NOT NULL,
    "interval" timestamp without time zone NOT NULL,
    post_up_vote_count integer DEFAULT 0 NOT NULL,
    post_down_vote_count integer DEFAULT 0 NOT NULL,
    post_none_vote_count integer DEFAULT 0 NOT NULL,
    comment_up_vote_count integer DEFAULT 0 NOT NULL,
    comment_down_vote_count integer DEFAULT 0 NOT NULL,
    comment_none_vote_count integer DEFAULT 0 NOT NULL,
    db_created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: vote_counts_aggregate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vote_counts_aggregate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vote_counts_aggregate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vote_counts_aggregate_id_seq OWNED BY public.vote_counts_aggregate.id;


--
-- Name: voting_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voting_stats (
    "interval" timestamp without time zone NOT NULL,
    votes_count integer DEFAULT 0 NOT NULL,
    db_created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    db_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: comment_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes ALTER COLUMN id SET DEFAULT nextval('public.comment_votes_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: post_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes ALTER COLUMN id SET DEFAULT nextval('public.post_votes_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vote_counts_aggregate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vote_counts_aggregate ALTER COLUMN id SET DEFAULT nextval('public.vote_counts_aggregate_id_seq'::regclass);


--
-- Name: comment_votes comment_votes_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_votes comment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: post_votes post_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_pkey PRIMARY KEY (id);


--
-- Name: post_votes post_votes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vote_counts_aggregate vote_counts_aggregate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vote_counts_aggregate
    ADD CONSTRAINT vote_counts_aggregate_pkey PRIMARY KEY (id);


--
-- Name: voting_stats voting_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voting_stats
    ADD CONSTRAINT voting_stats_pkey PRIMARY KEY ("interval");


--
-- Name: comment_votes_comment_id_and_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_votes_comment_id_and_user_id_idx ON public.comment_votes USING btree (comment_id, user_id);


--
-- Name: comments_author_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_author_id_idx ON public.comments USING btree (author_id);


--
-- Name: comments_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id);


--
-- Name: idx_vote_counts_aggregate_interval; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vote_counts_aggregate_interval ON public.vote_counts_aggregate USING btree ("interval" DESC);


--
-- Name: post_votes_post_id_and_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_votes_post_id_and_user_id_idx ON public.post_votes USING btree (post_id, user_id);


--
-- Name: posts_author_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_author_id_idx ON public.posts USING btree (author_id);


--
-- Name: posts_created_at_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_created_at_desc_idx ON public.posts USING btree (created_at DESC);


--
-- Name: posts_score_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_score_desc_idx ON public.posts USING btree (score DESC);


--
-- Name: unique_username_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_username_lower ON public.users USING btree (lower((username)::text));


--
-- Name: comment_votes set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.comment_votes FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: comments set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: post_votes set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.post_votes FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: posts set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: users set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: vote_counts_aggregate set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.vote_counts_aggregate FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: voting_stats set_db_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_db_updated_at BEFORE UPDATE ON public.voting_stats FOR EACH ROW EXECUTE FUNCTION public.update_db_updated_at_column();


--
-- Name: comment_votes comment_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id);


--
-- Name: comment_votes comment_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id);


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: post_votes post_votes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: post_votes post_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

