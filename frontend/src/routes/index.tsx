import invariant from "tiny-invariant";
import { createFileRoute } from "@tanstack/react-router";

import { usePosts, useUser } from "../queries";

import { PostsPage } from "../pages/PostsPage";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const user = useUser()!;
  const posts_response = usePosts(user.id);

  invariant(posts_response.result.case === "success", `Failed to get posts`);
  invariant(posts_response.result.value.postList?.posts != null, "Posts not found");

  return <PostsPage posts={posts_response.result.value.postList!.posts!} />;
}
