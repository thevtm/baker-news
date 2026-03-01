import invariant from "tiny-invariant";

import { DBOrTx } from "../db/db.ts";
import { Queries } from "../queries/index.ts";

import * as persisted from "./persisted.ts";
import * as application from "./application.ts";
import { PGMQMessage } from "../queries/pgmq.ts";

async function sleep(milliseconds: number): Promise<void> {
  let resolve;
  const promise = new Promise<void>((res) => (resolve = res));
  setTimeout(resolve!, milliseconds);
  await promise;
}

export function makeEventListenerWorker(db: DBOrTx, queries: Queries, dispatchFn: (event: application.Event) => void) {
  const visibility_timeout = 30;
  const error_sleep_time = 5 * 1000;

  return async () => {
    while (true) {
      const messages_result = await queries.pgmqReadMessageWithPoll(persisted.QUEUE_NAME, visibility_timeout, 1);

      if (messages_result.success === false) {
        console.error("Error reading message from queue", messages_result.error);
        await sleep(error_sleep_time);
        continue;
      }

      if (messages_result.data!.length === 0) {
        console.log("No messages in queue");
        continue;
      }

      const message = messages_result.data![0];
      const event_po = message.message as persisted.EventPO;

      console.log("Received message", event_po);

      if (event_po.type === persisted.EventTypePO.USER_CREATED_POST) {
        await handle_user_created_post(db, message, dispatchFn);
      } else if (event_po.type === persisted.EventTypePO.USER_DELETED_POST) {
        await handle_user_deleted_post(db, message, dispatchFn);
      } else if (event_po.type === persisted.EventTypePO.USER_VOTED_POST) {
        await handle_user_voted_post(db, message, dispatchFn);
      } else if (event_po.type === persisted.EventTypePO.USER_CREATED_COMMENT) {
        await handle_user_created_comment(db, message, dispatchFn);
      } else if (event_po.type === persisted.EventTypePO.USER_VOTED_COMMENT) {
        await handle_user_voted_comment(db, message, dispatchFn);
      } else {
        console.error("Unknown event type", event_po.type);
        return;
      }

      const archive_result = await queries.pgmqArchiveMessage(persisted.QUEUE_NAME, message.msg_id);
      invariant(archive_result.success, "Error archiving message");
    }
  };
}

async function handle_user_created_post(
  db: DBOrTx,
  message: PGMQMessage,
  dispatchFn: (event: application.Event) => void
) {
  const event_po = message.message as persisted.EventPO;
  const data_po = event_po.data as persisted.UserCreatedPostEventPOData;

  const post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, data_po.postId),
  });
  invariant(post !== undefined, "Post not found");

  const author = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, data_po.authorId),
  });
  invariant(author !== undefined, "User not found");

  const event_data: application.UserCreatedPostEventData = { post, author };

  const event: application.Event = {
    type: application.EventType.USER_CREATED_POST,
    data: event_data,
  };

  dispatchFn(event);
}

async function handle_user_deleted_post(
  db: DBOrTx,
  message: PGMQMessage,
  dispatchFn: (event: application.Event) => void
) {
  const event_po = message.message as persisted.EventPO;
  const data_po = event_po.data as persisted.UserDeletedPostEventPOData;

  const post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, data_po.postId),
  });
  invariant(post !== undefined, "Post not found");

  const event_data: application.UserDeletedPostEventData = { post };

  const event: application.Event = {
    type: application.EventType.USER_DELETED_POST,
    data: event_data,
  };

  dispatchFn(event);
}

async function handle_user_voted_post(
  db: DBOrTx,
  message: PGMQMessage,
  dispatchFn: (event: application.Event) => void
) {
  const event_po = message.message as persisted.EventPO;
  const data_po = event_po.data as persisted.UserVotedPostEventPOData;

  const post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, data_po.postId),
  });
  invariant(post !== undefined, "Post not found");

  const post_vote = await db.query.postVotes.findFirst({
    where: (post_votes, { eq }) => eq(post_votes.id, data_po.postVoteId),
  });
  invariant(post_vote !== undefined, "Post vote not found");

  const event_data: application.UserVotedPostEventData = {
    post: post,
    postVote: post_vote,
  };

  const event: application.Event = {
    type: application.EventType.USER_VOTED_POST,
    data: event_data,
  };

  dispatchFn(event);
}

async function handle_user_created_comment(
  db: DBOrTx,
  message: PGMQMessage,
  dispatchFn: (event: application.Event) => void
) {
  const event_po = message.message as persisted.EventPO;
  const data_po = event_po.data as persisted.UserCreatedCommentEventPOData;

  const comment = await db.query.comments.findFirst({
    where: (comments, { eq }) => eq(comments.id, data_po.commentId),
  });
  invariant(comment !== undefined, "Comment not found");

  const author = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, data_po.authorId),
  });
  invariant(author !== undefined, "User not found");

  const event_data: application.UserCreatedCommentEventData = { comment, author };

  const event: application.Event = {
    type: application.EventType.USER_CREATED_COMMENT,
    data: event_data,
  };

  dispatchFn(event);
}

async function handle_user_voted_comment(
  db: DBOrTx,
  message: PGMQMessage,
  dispatchFn: (event: application.Event) => void
) {
  const event_po = message.message as persisted.EventPO;
  const data_po = event_po.data as persisted.UserVotedCommentEventPOData;

  const comment = await db.query.comments.findFirst({
    where: (comments, { eq }) => eq(comments.id, data_po.commentId),
  });
  invariant(comment !== undefined, "Comment not found");

  const comment_vote = await db.query.commentVotes.findFirst({
    where: (comment_votes, { eq }) => eq(comment_votes.id, data_po.commentVoteId),
  });
  invariant(comment_vote !== undefined, "Comment vote not found");

  const event_data: application.UserVotedCommentEventData = {
    comment: comment,
    commentVote: comment_vote,
  };

  const event: application.Event = {
    type: application.EventType.USER_VOTED_COMMENT,
    data: event_data,
  };

  dispatchFn(event);
}
