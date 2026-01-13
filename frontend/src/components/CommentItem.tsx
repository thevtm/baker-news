import React from "react";
import invariant from "tiny-invariant";

import * as proto from "../proto";
import { useUser } from "../queries";
import { useAPIClient } from "../contexts/api-client";

import VoteButton from "./VoteButton";

import { sprinkles } from "../sprinkles.css";

export interface CommentItemProps {
  comment: proto.Comment;
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const user = useUser();
  const api_client = useAPIClient();

  const created_at_formatted_date = formatDateToYYYYMMDD(proto.convertDate(comment.createdAt!));

  const vote_state: proto.VoteType = comment.vote ? comment.vote.voteType : proto.VoteType.NO_VOTE;
  const up_vote_active = vote_state === proto.VoteType.UP_VOTE;
  const down_vote_active = vote_state === proto.VoteType.DOWN_VOTE;

  const handleVote = async (voteType: proto.VoteType) => {
    const response = await api_client.voteComment({ userId: user.id, commentId: comment.id, voteType });

    if (response.result.case === "error") {
      console.error("Failed to vote:", response.result.value.message);
      return;
    }

    invariant(response.result.case === "success");

    // TODO: Update the comment state in the UI
  };

  return (
    <div className={sprinkles({ display: "flex", marginY: 1 })}>
      {/* Left Column */}
      <div className={sprinkles({ display: "flex", flexDirection: "column", marginX: 2 })}>
        <VoteButton
          voteType={proto.VoteType.UP_VOTE}
          active={up_vote_active}
          onClick={() => handleVote(up_vote_active ? proto.VoteType.NO_VOTE : proto.VoteType.UP_VOTE)}
        />

        <VoteButton
          voteType={proto.VoteType.DOWN_VOTE}
          active={down_vote_active}
          onClick={() => handleVote(down_vote_active ? proto.VoteType.NO_VOTE : proto.VoteType.DOWN_VOTE)}
        />
      </div>

      {/* Right Column */}
      <div className={sprinkles({ display: "flex", flexDirection: "column", color: "black" })}>
        {/* Top Bar */}
        <div className={sprinkles({ display: "flex", fontSize: "xs", color: "gray-500" })}>
          {comment.score} points by {comment.author!.username} {created_at_formatted_date}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <a href="#">reply</a>
        </div>

        {/* Content */}
        <div className={sprinkles({ fontSize: "sm" })}>{comment.content}</div>
      </div>
    </div>
  );
};

export default CommentItem;
