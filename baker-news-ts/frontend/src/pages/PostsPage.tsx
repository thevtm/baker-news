import { Suspense } from "react";

import { PostList } from "../components/PostList";
import CreatePostForm from "../components/CreatePostForm";

import { sprinkles } from "../css/sprinkles.css";

const style = sprinkles({
  flexGrow: 1,
});

export const PostsPage: React.FC = () => {
  return (
    <div className={style}>
      <CreatePostForm />
      <Suspense fallback={<div>Loading...</div>}>
        <PostList />
      </Suspense>
    </div>
  );
};
