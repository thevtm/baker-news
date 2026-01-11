import React from "react";
import cslx from "clsx";

import { sprinkles } from "../sprinkles.css";
import { container } from "../styles.css";

import { Post } from "../state";
import PostItem from "./PostItem";

export interface PostListProps {
  posts: readonly Post[];
}

// container mx-auto bg-orange-100 py-1
const style = sprinkles({
  marginX: "auto",
  background: "orange-100",
  paddingY: 1,
});

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div className={cslx(container, style)}>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostList;
