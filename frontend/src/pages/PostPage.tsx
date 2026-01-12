import cslx from "clsx";

import * as proto from "../proto";

import PostItem from "../components/PostItem";
import CommentList from "../components/CommentList";

import { sprinkles } from "../sprinkles.css";
import { container } from "../styles.css";

// container mx-auto bg-orange-100 py-1
const style = sprinkles({
  marginX: "auto",
  background: "orange-100",
  paddingY: 1,
});

export interface PostPageProps {
  post: proto.Post;
}

export const PostPage: React.FC<PostPageProps> = ({ post }) => {
  return (
    <div className={cslx(container, style)}>
      <PostItem key={post.id} post={post} />
      <CommentList comments={post.comments!.comments} />
    </div>
  );
};
