import React from "react";
import { invariant, Link } from "@tanstack/react-router";

import * as proto from "../proto";
import { getPostQueryKey, useUser } from "../queries";
import { useStore } from "../contexts/store";
import { useAPIClient } from "../contexts/api-client";

import VoteButton from "./VoteButton";

import { sprinkles } from "../sprinkles.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const store = useStore();
  const api_client = useAPIClient();
  const query_client = useQueryClient();
  const user = useUser();

  const vote_mutation = useMutation({
    mutationFn: async (voteType: proto.VoteType) => {
      if (store.user === null) return;

      if (post.vote?.voteType === voteType) {
        voteType = proto.VoteType.NO_VOTE;
      }

      const response = await api_client.votePost({ userId: user.id, postId: post.id, voteType });

      if (response.result.case === "error") {
        console.error("Failed to vote:", response.result.value.message);
        return;
      }

      await query_client.invalidateQueries({ queryKey: getPostQueryKey(user.id, post.id) });
    },
  });

  const url = new URL(post.url);
  const url_host_href = `${url.protocol}//${url.host}`;

  const created_at_formatted_date = formatDateToYYYYMMDD(proto.convertDate(post.createdAt!));

  const vote_state: proto.VoteType = post.vote ? post.vote.voteType : proto.VoteType.NO_VOTE;

  return (
    <div className={sprinkles({ display: "flex", paddingY: 1 })}>
      {/* Vote Buttons */}
      <div className={sprinkles({ display: "flex", flexDirection: "column", marginX: 2 })}>
        <VoteButton
          voteType={proto.VoteType.UP_VOTE}
          active={vote_state === proto.VoteType.UP_VOTE}
          onClick={() => vote_mutation.mutate(proto.VoteType.UP_VOTE)}
        />

        <VoteButton
          voteType={proto.VoteType.DOWN_VOTE}
          active={vote_state === proto.VoteType.DOWN_VOTE}
          onClick={() => vote_mutation.mutate(proto.VoteType.DOWN_VOTE)}
        />
      </div>

      <div className={sprinkles({ display: "flex", flexDirection: "column", color: "black" })}>
        <div>
          <a href={post.url}>{post.title}</a>

          <a
            href={url_host_href}
            className={sprinkles({ paddingLeft: 1, fontSize: "xs", color: "gray-500", alignSelf: "flex-end" })}
          >
            ({url.host})
          </a>
        </div>

        <div className={sprinkles({ display: "flex", flexDirection: "row", color: "gray-500" })}>
          <span className="post-score">{post.score}</span>&nbsp;points by {post.author!.username}{" "}
          {created_at_formatted_date}
          {/* Delete */}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <a className="hover:underline" href="/delete-post">
            delete
          </a>
          {/* Comments */}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <Link
            to={`/posts/$postId`}
            params={{ postId: post.id.toString() }}
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
