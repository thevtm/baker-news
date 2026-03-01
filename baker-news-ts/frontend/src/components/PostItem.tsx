import React from "react";
import invariant from "tiny-invariant";
import { Link } from "@tanstack/react-router";

import * as proto from "../proto";
import { useUser } from "../queries";
import { useAPIClient } from "../contexts/api-client";

import VoteButton from "./VoteButton";

import { sprinkles } from "../css/sprinkles.css";

export interface PostItemProps {
  post: proto.Post;
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const PostItem: React.FC<PostItemProps> = ({ post }) => {
  const api_client = useAPIClient();
  const user = useUser();

  const url = new URL(post.url);
  const url_host_href = `${url.protocol}//${url.host}`;

  const created_at_formatted_date = formatDateToYYYYMMDD(proto.convertDate(post.createdAt!));

  const vote_state: proto.VoteType = post.vote ? post.vote.voteType : proto.VoteType.NO_VOTE;
  const up_vote_active = vote_state === proto.VoteType.UP_VOTE;
  const down_vote_active = vote_state === proto.VoteType.DOWN_VOTE;

  const handle_vote = async (voteType: proto.VoteType) => {
    const response = await api_client.votePost({ userId: user.id, postId: post.id, voteType });

    if (response.result.case === "error") {
      console.error("Failed to vote:", response.result.value.message);
      return;
    }

    invariant(response.result.case === "success");
  };

  const handle_delete_post = async (e: React.FormEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const response = await api_client.deletePost({ postId: post.id });

    if (response.result.case === "error") {
      console.error("Failed to delete post:", response.result.value.message);
      return;
    }

    invariant(response.result.case === "success");
  };

  return (
    <div className={sprinkles({ display: "flex", paddingY: 1 })}>
      {/* Vote Buttons */}
      <div className={sprinkles({ display: "flex", flexDirection: "column", marginX: 2 })}>
        <VoteButton
          voteType={proto.VoteType.UP_VOTE}
          active={up_vote_active}
          onClick={() => handle_vote(up_vote_active ? proto.VoteType.NO_VOTE : proto.VoteType.UP_VOTE)}
        />

        <VoteButton
          voteType={proto.VoteType.DOWN_VOTE}
          active={down_vote_active}
          onClick={() => handle_vote(down_vote_active ? proto.VoteType.NO_VOTE : proto.VoteType.DOWN_VOTE)}
        />
      </div>

      <div className={sprinkles({ display: "flex", flexDirection: "column", color: "black" })}>
        <div>
          <a href={post.url} className={sprinkles({ color: "black", textDecoration: "none" })}>
            {post.title}
          </a>

          <a
            href={url_host_href}
            className={sprinkles({ paddingLeft: 1, fontSize: "xs", color: "gray-500", alignSelf: "flex-end" })}
          >
            ({url.host})
          </a>
        </div>

        <div className={sprinkles({ display: "flex", flexDirection: "row", color: "gray-500", fontSize: "xs" })}>
          <span className="post-score">{post.score}</span>&nbsp;points by {post.author!.username}{" "}
          {created_at_formatted_date}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          {/* Delete */}
          <a className={sprinkles({ color: "gray-500", textDecoration: "none" })} onClick={handle_delete_post} href="#">
            delete
          </a>
          {/* Comments */}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <Link
            to={`/posts/$postId`}
            params={{ postId: post.id.toString() }}
            className={sprinkles({ color: "gray-500", textDecoration: "none" })}
            activeProps={{ className: "hover:underline" }}
            activeOptions={{ exact: true }}
          >
            {post.commentCount} comments
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostItem;
