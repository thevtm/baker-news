import invariant from "tiny-invariant";
import { createFileRoute } from "@tanstack/react-router";

import { PostPage } from "../pages/PostPage";
import { usePost, useUser } from "../queries";

export const Route = createFileRoute("/posts/$postId")({
  component: PostsShowRouteComponent,
});

function PostsShowRouteComponent() {
  const params = Route.useParams();
  const post_id = parseInt(params.postId);

  const user = useUser();

  const post_response = usePost(user.id, post_id);

  invariant(post_response.result.case === "success", `Failed to get post`);
  invariant(post_response.result.value.post != null, "Post not found");

  return <PostPage post={post_response.result.value.post!} />;
}
