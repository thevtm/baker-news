import { Suspense } from "react";

import { PostList } from "../components/PostList";
import CreatePostForm from "../components/CreatePostForm";

export const PostsPage: React.FC = () => {
  return (
    <>
      <CreatePostForm />
      <Suspense fallback={<div>Loading...</div>}>
        <PostList />
      </Suspense>
    </>
  );
};
