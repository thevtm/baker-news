import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code, ConnectError } from "@connectrpc/connect";
import { useSnapshot } from "valtio";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostsPage } from "../pages/PostsPage";
import { useAPIClient } from "../contexts/api-client.tsx";
import { handleGetPostsFeedEvent, makePostsPageStore } from "../state/posts-page-store.ts";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const api_client = useAPIClient();
  const user = useUser();

  const store = useMemo(() => makePostsPageStore(), []);
  const snap = useSnapshot(store);
  const posts = snap.posts as proto.Post[];

  useEffect(() => {
    const abort_controller = new AbortController();

    (async () => {
      try {
        const feed = api_client.getPostsFeed({ userId: user.id }, { signal: abort_controller.signal });
        for await (const response of feed) handleGetPostsFeedEvent(store, response);
      } catch (err) {
        if (err instanceof ConnectError && err.code != Code.Canceled) {
          // It's being aborted
        } else {
          throw err;
        }
      }
    })();

    return () => abort_controller.abort("Unmounting");
  }, [api_client, user.id, store]);

  return <PostsPage posts={posts} />;
}
