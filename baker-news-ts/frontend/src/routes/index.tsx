import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PostsPage } from "../pages/PostsPage";
import { makePostsPageStore } from "../state/posts-page-store.ts";
import { PostsPageStoreProvider } from "../contexts/posts-page-store.tsx";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const store = useMemo(() => makePostsPageStore(), []);

  return (
    <PostsPageStoreProvider store={store}>
      <PostsPage />
    </PostsPageStoreProvider>
  );
}
