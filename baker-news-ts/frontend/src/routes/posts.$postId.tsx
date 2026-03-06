import { useEffect, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PostPage } from "../pages/PostPage";
import { makePostStore, stopLoadingPost } from "../state/post-page-store.ts";
import { PostPageStoreProvider } from "../contexts/post-page-store.tsx";

export const Route = createFileRoute("/posts/$postId")({
  component: PostsShowRouteComponent,
});

const store = makePostStore();

function PostsShowRouteComponent() {
  const params = Route.useParams();
  const post_id = parseInt(params.postId);

  useEffect(() => {
    return () => stopLoadingPost(store);
  }, []);

  return (
    <PostPageStoreProvider store={store}>
      <Suspense fallback={<div>Loading...</div>}>
        <PostPage postId={post_id} />
      </Suspense>
    </PostPageStoreProvider>
  );
}
