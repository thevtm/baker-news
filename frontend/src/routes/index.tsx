import { useEffect, useReducer } from "react";
import invariant from "tiny-invariant";
import { createFileRoute } from "@tanstack/react-router";
import { Code, ConnectError } from "@connectrpc/connect";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostsPage } from "../pages/PostsPage";
import { useAPIClient } from "../contexts/api-client.tsx";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

interface State {
  state: string;
  posts: proto.Post[];
}

const INITIAL_STATE: State = {
  state: "initial",
  posts: [],
};

function reducer(state: State, response: proto.GetPostsFeedResponse): State {
  if (response.result.case === "error") {
    const error = response.result.value;
    console.error("Error fetching posts:", error.message);
    return { ...state, state: "error" };
  }

  // throw new Error(`Invalid action "${action.result.case}"`);

  console.log("Fetched posts:", response);

  invariant(response.result.case === "success");

  invariant(response.result.value.event.case !== undefined);
  const event_name = response.result.value.event.case;

  if (event_name === "initialPosts") {
    const posts = response.result.value.event.value.posts;
    return { ...state, posts: posts };
  } else if (event_name === "postScoreChanged") {
    const event = response.result.value.event.value as proto.PostScoreChanged;

    const post_index = state.posts.findIndex((post) => post.id === event.postId);
    invariant(post_index !== -1, "Post not found");

    const updated_post = { ...state.posts[post_index], score: event.newScore };
    const updated_posts = [...state.posts];
    updated_posts[post_index] = updated_post;
    return { ...state, posts: updated_posts };
  } else if (event_name === "userVotedPost") {
    const event = response.result.value.event.value as proto.UserVotedPost;
    const vote = event.vote!;

    const post_index = state.posts.findIndex((post) => post.id === vote.postId);
    invariant(post_index !== -1, "Post not found");

    const updated_post = { ...state.posts[post_index], score: event.newScore, vote };
    const updated_posts = [...state.posts];
    updated_posts[post_index] = updated_post;
    return { ...state, posts: updated_posts };
  }

  return state;
}

function IndexRouteComponent() {
  const api_client = useAPIClient();
  const user = useUser();

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const abort_controller = new AbortController();

    (async () => {
      try {
        const feed = api_client.getPostsFeed({ userId: user.id }, { signal: abort_controller.signal });
        for await (const response of feed) dispatch(response);
      } catch (err) {
        if (err instanceof ConnectError && err.code != Code.Canceled) {
          // It's being aborted
        } else {
          throw err;
        }
      }
    })();

    return () => abort_controller.abort("Unmounting");
  }, [api_client, user.id]);

  return <PostsPage posts={state.posts} />;
}
