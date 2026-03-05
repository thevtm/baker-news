import { useEffect, useMemo } from "react";
import { createFileRoute, invariant } from "@tanstack/react-router";
import { useSnapshot } from "valtio";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostsPage } from "../pages/PostsPage";
import { useAPIClient } from "../contexts/api-client.tsx";
import { makePostsPageStore, startLoadingPosts, stopLoadingPosts } from "../state/posts-page-store.ts";

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
    invariant(user.id !== undefined);
    startLoadingPosts(store, api_client, user.id);

    return () => stopLoadingPosts(store);
  }, [api_client, user.id, store]);

  return <PostsPage posts={posts} />;
}
