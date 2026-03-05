import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSnapshot } from "valtio";
import invariant from "tiny-invariant";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostsPage } from "../pages/PostsPage";
import { useAPIClient } from "../contexts/api-client.tsx";
import { makePostsPageStore, PostsPageState, startLoadingPosts, stopLoadingPosts } from "../state/posts-page-store.ts";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const api_client = useAPIClient();
  const user = useUser();

  const store = useMemo(() => makePostsPageStore(), []);
  const snap = useSnapshot(store);

  if (snap.state === PostsPageState.Initial) {
    startLoadingPosts(store, api_client, user.id);
  }

  useEffect(() => {
    return () => stopLoadingPosts(store);
  }, [store]);

  if (snap.state === PostsPageState.Loading) {
    invariant(snap.promise !== null);
    throw snap.promise;
  }

  const posts = snap.posts as proto.Post[];
  return <PostsPage posts={posts} />;
}
