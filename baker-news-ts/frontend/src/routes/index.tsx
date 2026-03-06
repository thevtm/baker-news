import { createFileRoute } from "@tanstack/react-router";

import { PostsPage } from "../pages/PostsPage";
import { makePostsPageStore, stopLoadingPosts } from "../state/posts-page-store.ts";
import { PostsPageStoreProvider } from "../contexts/posts-page-store.tsx";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

const store = makePostsPageStore();

function IndexRouteComponent() {
  useEffect(() => {
    return () => {
      // Stop loading posts when navigating away from the page
      // (causes flicker in development when React Strict Mode mounts/unmounts components twice)
      stopLoadingPosts(store);
    };
  }, []);

  return (
    <PostsPageStoreProvider store={store}>
      <PostsPage />
    </PostsPageStoreProvider>
  );
}
