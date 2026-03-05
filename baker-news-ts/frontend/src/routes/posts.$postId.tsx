import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import * as proto from "../proto/index.ts";
import { useUser } from "../queries";
import { PostPage } from "../pages/PostPage";
import { useAPIClient } from "../contexts/api-client.tsx";
import { makePostStore, PostPageComment, startLoadingPost, stopLoadingPost } from "../state/post-page-store.ts";
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
    startLoadingPost(store, api_client, user.id, post_id);
    return () => stopLoadingPost(store);
  }, [api_client, user.id, post_id, store]);

  if (snap.post === null) {
    return <div>Loading...</div>;
  }

  return <PostPage post={snap.post as proto.Post} rootComments={snap.rootComments as PostPageComment[]} />;
}
