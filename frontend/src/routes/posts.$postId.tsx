import { useEffect, useMemo } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { createFileRoute } from "@tanstack/react-router";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostPage } from "../pages/PostPage";
import { useAPIClient } from "../contexts/api-client.tsx";
import { handleFeedEvent, makePostStore, PostPageComment } from "../state/post-store.ts";
import { useSnapshot } from "valtio";

export const Route = createFileRoute("/posts/$postId")({
  component: PostsShowRouteComponent,
});

function PostsShowRouteComponent() {
  const params = Route.useParams();
  const post_id = parseInt(params.postId);

  const api_client = useAPIClient();
  const user = useUser();

  const store = useMemo(() => makePostStore(), []);
  const snap = useSnapshot(store);

  useEffect(() => {
    const abort_controller = new AbortController();

    (async () => {
      try {
        const feed = api_client.getPostFeed({ userId: user.id, postId: post_id }, { signal: abort_controller.signal });
        for await (const response of feed) handleFeedEvent(store, response);
      } catch (err) {
        if (err instanceof ConnectError && err.code != Code.Canceled) {
          // It's being aborted
        } else {
          throw err;
        }
      }
    })();

    return () => abort_controller.abort("Unmounting");
  }, [api_client, user.id, post_id, store]);

  if (snap.post === null) {
    return <div>Loading...</div>;
  }

  return <PostPage post={snap.post as proto.Post} rootComments={snap.rootComments as PostPageComment[]} />;
}
