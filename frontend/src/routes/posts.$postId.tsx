import { useEffect, useReducer } from "react";
import invariant from "tiny-invariant";
import { Code, ConnectError } from "@connectrpc/connect";
import { createFileRoute } from "@tanstack/react-router";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostPage } from "../pages/PostPage";
import { useAPIClient } from "../contexts/api-client.tsx";

export const Route = createFileRoute("/posts/$postId")({
  component: PostsShowRouteComponent,
});

interface State {
  state: string;
  post: proto.Post | null;
}

const INITIAL_STATE: State = {
  state: "initial",
  post: null,
};

function reducer(state: State, response: proto.GetPostFeedResponse): State {
  if (response.result.case === "error") {
    const error = response.result.value;
    console.error("Error fetching posts:", error.message);
    return { ...state, state: "error" };
  }

  console.log("Fetched posts:", response);

  invariant(response.result.case === "success");

  invariant(response.result.value.event.case !== undefined);
  const event_name = response.result.value.event.case;

  if (event_name === "initialPost") {
    const post = response.result.value.event.value;
    return { ...state, post: post };
  } else if (event_name === "postScoreChanged") {
    const event = response.result.value.event.value as proto.PostScoreChanged;
    const updated_post = { ...state.post, score: event.newScore } as proto.Post;
    return { ...state, post: updated_post };
  } else if (event_name === "userVotedPost") {
    const event = response.result.value.event.value as proto.UserVotedPost;
    const vote = event.vote!;
    const updated_post = { ...state.post, score: event.newScore, vote } as proto.Post;
    return { ...state, post: updated_post };
  }

  return state;
}

function PostsShowRouteComponent() {
  const params = Route.useParams();
  const post_id = parseInt(params.postId);

  const api_client = useAPIClient();
  const user = useUser();

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const abort_controller = new AbortController();

    (async () => {
      try {
        const feed = api_client.getPostFeed({ userId: user.id, postId: post_id }, { signal: abort_controller.signal });
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
  }, [api_client, user.id, post_id]);

  if (state.post === null) {
    return <div>Loading...</div>;
  }

  return <PostPage post={state.post} />;
}
