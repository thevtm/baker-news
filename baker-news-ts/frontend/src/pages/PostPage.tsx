import cslx from "clsx";

import { usePost } from "../hooks";
import PostItem from "../components/PostItem";
import CommentList from "../components/CommentList";

import { sprinkles } from "../css/sprinkles.css";
import { container } from "../css/styles.css";
import { CommentForm } from "../components/CommentForm";

const style = sprinkles({
  background: "orange-100",

  paddingY: 1,

  flexGrow: 1,
});

export interface PostPageProps {
  postId: number;
}

export const PostPage: React.FC<PostPageProps> = ({ postId }) => {
  const { post, rootComments } = usePost(postId);

  return (
    <div className={cslx(container, style)}>
      <PostItem key={post.id} post={post} />
      <CommentForm parent={{ case: "postId", value: post.id }} />
      <CommentList comments={rootComments} />
    </div>
  );
};
