import React from "react";

import * as proto from "../proto";
import { CommentItem } from "./CommentItem";

export interface CommentListProps {
  comments: readonly proto.Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};

export default CommentList;
