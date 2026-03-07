import React from "react";
import clsx from "clsx";

import PostItem from "./PostItem";

import { sprinkles } from "../css/sprinkles.css";
import { container } from "../css/styles.css";
import { usePosts } from "../hooks";

// container mx-auto bg-orange-100 py-1
const style = sprinkles({
  background: "orange-100",
  paddingY: 1,
});

export const PostList: React.FC = () => {
  const posts = usePosts();

  return (
    <div className={clsx(container, style)}>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostList;
