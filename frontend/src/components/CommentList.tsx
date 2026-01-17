import React from "react";

import { CommentItem } from "./CommentItem";
import { PostPageComment } from "../state/post-store";

export interface CommentListProps {
  comments: PostPageComment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.comment.id} comment={comment as PostPageComment} />
      ))}
    </div>
  );
};

export default CommentList;
