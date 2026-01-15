// This file should probably be in another folder
// but I don't know where to put it yet

import { exit } from "node:process";
import { faker } from "@faker-js/faker";

import { db as global_db, schema } from "./db/index.ts";
import { createCommands } from "./commands/index.ts";
import { createQueries } from "./queries/index.ts";
import { createEvents } from "./events.ts";
import { DBOrTx } from "./db/index.ts";

export async function seed(db: DBOrTx = global_db) {
  // Constants
  const NUM_USERS = 100;
  const NUM_POSTS = 10;
  const NUM_ROOT_COMMENTS = 20;
  const NUM_CHILD_COMMENTS = 20;
  const NUM_POST_VOTES = 200;
  const NUM_COMMENT_VOTES = 100;

  // Dependencies

  await db.transaction(async (tx) => {
    console.log("Seeding database...");

    const events = createEvents();
    const queries = createQueries(tx);
    const commands = createCommands(tx, queries, events);

    // Users
    const user_ids = new Array<number>(NUM_USERS);

    for (let i = 0; i < NUM_USERS; i++) {
      const result = await commands.createUser({ username: faker.internet.username() });
      if (!result.success) throw new Error(`Failed to create user: ${result.error}`);
      user_ids[i] = result.data!.user.id;
    }

    console.log(`Seeded ${NUM_USERS} users.`);

    // Posts
    const post_ids = new Array<number>(NUM_POSTS);

    for (let i = 0; i < NUM_POSTS; i++) {
      const result = await commands.createPost({
        title: faker.lorem.sentence({ min: 2, max: 10 }),
        url: faker.internet.url(),
        authorId: user_ids[faker.number.int({ min: 0, max: user_ids.length - 1 })],
      });
      if (!result.success) throw new Error(`Failed to create post: ${result.error}`);
      post_ids[i] = result.data!.id;
    }

    console.log(`Seeded ${NUM_POSTS} posts.`);

    // Root comments
    const comment_ids = new Array<number>(NUM_ROOT_COMMENTS);

    for (let i = 0; i < NUM_ROOT_COMMENTS; i++) {
      const result = await commands.createComment({
        content: faker.lorem.sentence({ min: 2, max: 10 }),
        postId: post_ids[faker.number.int({ min: 0, max: post_ids.length - 1 })],
        authorId: user_ids[faker.number.int({ min: 0, max: user_ids.length - 1 })],
      });
      if (!result.success) throw new Error(`Failed to create root comment: ${result.error}`);
      comment_ids[i] = result.data!.comment.id;
    }

    console.log(`Seeded ${NUM_ROOT_COMMENTS} root comments.`);

    // Child comments
    for (let i = 0; i < NUM_CHILD_COMMENTS; i++) {
      const result = await commands.createComment({
        content: faker.lorem.sentence({ min: 2, max: 10 }),
        authorId: user_ids[faker.number.int({ min: 0, max: user_ids.length - 1 })],
        parentCommentId: comment_ids[faker.number.int({ min: 0, max: comment_ids.length - 1 })],
      });
      if (!result.success) throw new Error(`Failed to create child comment: ${result.error}`);
    }

    console.log(`Seeded ${NUM_CHILD_COMMENTS} child comments.`);

    // Post votes
    for (let i = 0; i < NUM_POST_VOTES; i++) {
      const result = await commands.votePost({
        userId: user_ids[faker.number.int({ min: 0, max: user_ids.length - 1 })],
        postId: post_ids[faker.number.int({ min: 0, max: post_ids.length - 1 })],
        voteType: faker.helpers.arrayElement(schema.voteTypes.enumValues),
      });
      if (!result.success) throw new Error(`Failed to vote on post: ${result.error}`);
    }

    console.log(`Seeded ${NUM_POST_VOTES} post votes.`);

    // Comment votes
    for (let i = 0; i < NUM_COMMENT_VOTES; i++) {
      const result = await commands.voteComment({
        userId: user_ids[faker.number.int({ min: 0, max: user_ids.length - 1 })],
        commentId: comment_ids[faker.number.int({ min: 0, max: comment_ids.length - 1 })],
        voteType: faker.helpers.arrayElement(schema.voteTypes.enumValues),
      });
      if (!result.success) throw new Error(`Failed to vote on comment: ${result.error}`);
    }

    console.log(`Seeded ${NUM_COMMENT_VOTES} comment votes.`);

    console.log("Done!");
  });
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.log("Seed function executed successfully");
      exit(0);
    })
    .catch((error) => {
      console.error("Error executing seed function:", error);
      exit(-1);
    });
}
