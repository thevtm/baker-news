import React from "react";
import cslx from "clsx";

import * as proto from "../proto";

import PostItem from "./PostItem";

import { sprinkles } from "../css/sprinkles.css";
import { container } from "../css/styles.css";

export interface PostListProps {
  posts: readonly proto.Post[];
}

// container mx-auto bg-orange-100 py-1
const style = sprinkles({
  marginX: "auto",
  background: "orange-100",
  paddingY: 1,
});

export const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div className={cslx(container, style)}>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostList;
