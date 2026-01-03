import _ from "lodash";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";

import { CommandReturnType } from "./index.ts";
import { VoteType, voteTypes } from "../db/schema.ts";
import { assert } from "@std/assert";

export interface VotePostCommandInput {
  userId: number;
  postId: number;
  voteType: VoteType;
}

export interface VotePostReturnData {
  newVoteCount: number;
}

export type VotePostCommandFunction = (input: VotePostCommandInput) => Promise<CommandReturnType<VotePostReturnData>>;

export function createVotePostCommand(db: DBOrTx, queries: Queries): VotePostCommandFunction {
  const input_validator = z.object({
    userId: z
      .number()
      .int()
      .finite("Invalid user ID")
      .positive("Invalid user ID")
      .refine(async (user_id) => await queries.userExists(user_id), "User doesn't exist"),

    postId: z
      .number()
      .int()
      .finite("Invalid post ID")
      .positive("Invalid post ID")
      .refine(async (post_id) => await queries.postExists(post_id), "Post doesn't exist"),

    voteType: z.enum(voteTypes.enumValues),
  });

  return async (input: VotePostCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { postId, userId, voteType } = validation_result.data;

    // Check if the user has already voted on the post
    const existingVote = await db
      .select()
      .from(schema.postVotes)
      .where(and(eq(schema.postVotes.postId, postId), eq(schema.postVotes.userId, userId)))
      .limit(1);

    if (existingVote.length > 0) {
      await db.update(schema.postVotes).set({ voteType }).where(eq(schema.postVotes.id, existingVote[0].id));
    } else {
      const vote: typeof schema.postVotes.$inferInsert = { postId, userId, voteType };
      await db.insert(schema.postVotes).values(vote);
    }

    // Get new vote count
    const voteCountResult = await db
      .select({ newVoteCount: schema.posts.score })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));

    const voteCount = voteCountResult[0]!.newVoteCount;

    assert(voteCount !== undefined, "Vote count should not be undefined");

    return { success: true, data: { newVoteCount: voteCount } };
  };
}
