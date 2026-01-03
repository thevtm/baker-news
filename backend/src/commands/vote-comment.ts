import _ from "lodash";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";

import { CommandReturnType } from "./index.ts";
import { VoteType, voteTypes } from "../db/schema.ts";
import { assert } from "@std/assert";

export interface VoteCommentCommandInput {
  userId: number;
  commentId: number;
  voteType: VoteType;
}

export interface VoteCommentReturnData {
  newVoteCount: number;
}

export type VoteCommentCommandFunction = (
  input: VoteCommentCommandInput
) => Promise<CommandReturnType<VoteCommentReturnData>>;

export function createVoteCommentCommand(db: DBOrTx, queries: Queries): VoteCommentCommandFunction {
  const input_validator = z.object({
    userId: z
      .number()
      .int()
      .finite("Invalid user ID")
      .positive("Invalid user ID")
      .refine(async (user_id) => await queries.userExists(user_id), "User doesn't exist"),

    commentId: z
      .number()
      .int()
      .finite("Invalid comment ID")
      .positive("Invalid comment ID")
      .refine(async (comment_id) => await queries.commentsExists(comment_id), "Comment doesn't exist"),

    voteType: z.enum(voteTypes.enumValues),
  });

  return async (input: VoteCommentCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { commentId, userId, voteType } = validation_result.data;

    // Check if the user has already voted on the comment
    const existingVote = await db
      .select()
      .from(schema.commentVotes)
      .where(and(eq(schema.commentVotes.commentId, commentId), eq(schema.commentVotes.userId, userId)))
      .limit(1);

    // Insert / update the vote
    if (existingVote.length > 0) {
      await db.update(schema.commentVotes).set({ voteType }).where(eq(schema.commentVotes.id, existingVote[0].id));
    } else {
      const vote: typeof schema.commentVotes.$inferInsert = { commentId, userId, voteType };
      await db.insert(schema.commentVotes).values(vote);
    }

    // Get new vote count
    const voteCountResult = await db
      .select({ newVoteCount: schema.comments.score })
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));

    const newVoteCount = voteCountResult[0]!.newVoteCount;

    assert(newVoteCount !== undefined, "Vote count should not be undefined");

    return { success: true, data: { newVoteCount } };
  };
}
