import React from "react";

import { Post, votePost, VoteType } from "../state";
import { useStore } from "../contexts/store";
import { useAPIClient } from "../contexts/api-client";

import VoteButton from "./VoteButton";

import { sprinkles } from "../sprinkles.css";

export interface PostItemProps {
  post: Post;
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

  const { createdAt } = post;

  const url = new URL(post.url);
  const url_host_href = `${url.protocol}//${url.host}`;

  const created_at_formatted_date = formatDateToYYYYMMDD(createdAt);

  const vote_state: VoteType = post.vote ? post.vote.voteType : VoteType.NoVote;

  const handleVote = async (voteType: VoteType) => {
    if (store.user === null) return;

    if (vote_state === voteType) {
      voteType = VoteType.NoVote;
    }

    await votePost(store, api_client, post.id, voteType);
  };

  return (
    <div className={sprinkles({ display: "flex", paddingY: 1 })}>
      {/* Vote Buttons */}
      <div className={sprinkles({ display: "flex", flexDirection: "column", marginX: 2 })}>
        <VoteButton
          voteType={VoteType.UpVote}
          active={vote_state === VoteType.UpVote}
          onClick={() => handleVote(VoteType.UpVote)}
        />

        <VoteButton
          voteType={VoteType.DownVote}
          active={vote_state === VoteType.DownVote}
          onClick={() => handleVote(VoteType.DownVote)}
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
          <span className="post-score">{post.score}</span>&nbsp;points by {post.author.username}{" "}
          {created_at_formatted_date}
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <a className="hover:underline" href="/delete-post">
            delete
          </a>
          <span className={sprinkles({ marginX: 1 })}>|</span>
          <a className="hover:underline" href="" hx-get={post.commentsCount} hx-target="main" hx-push-url="true">
            {post.commentsCount} comments
          </a>
        </div>
      </div>
    </div>
  );
};

export default PostItem;
