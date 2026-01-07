import { assert } from "@std/assert";
import _ from "lodash";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";

import { ApplicationError } from "../error.ts";
import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";

import { CommandReturnType } from "./index.ts";

export interface VoteCommentCommandInput {
  userId: number;
  commentId: number;
  voteType: schema.VoteType;
}

export interface VoteCommentReturnData {
  newScore: number;
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

    voteType: z.enum(schema.voteTypes.enumValues),
  });

  return async (input: VoteCommentCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { commentId, userId, voteType } = validation_result.data;

    ////////////////////////////////////////////////////////////////////////////

    let result: CommandReturnType<VoteCommentReturnData> | null = null;

    await db.transaction(async (tx) => {
      // Check if the user has already voted on the comment
      const existing_vote = await tx
        .select()
        .from(schema.commentVotes)
        .where(and(eq(schema.commentVotes.commentId, commentId), eq(schema.commentVotes.userId, userId)))
        .limit(1);

      const has_voted = existing_vote.length > 0;

      // Insert / update the vote
      if (has_voted) {
        await tx.update(schema.commentVotes).set({ voteType }).where(eq(schema.commentVotes.id, existing_vote[0].id));
      } else {
        const vote: typeof schema.commentVotes.$inferInsert = { commentId, userId, voteType };
        await tx.insert(schema.commentVotes).values(vote);
      }

      // Update the comment's score
      const existing_vote_value = has_voted ? schema.vote_types_values_map.get(existing_vote[0].voteType) : 0;
      assert(existing_vote_value !== undefined);

      const new_vote_value = schema.vote_types_values_map.get(voteType);
      assert(new_vote_value !== undefined);

      const vote_difference = new_vote_value - existing_vote_value;
      assert(vote_difference !== undefined);

      const vote_count_result = await tx
        .update(schema.comments)
        .set({ score: sql`${schema.comments.score} + ${vote_difference}` })
        .where(eq(schema.comments.id, commentId))
        .returning({ newVoteCount: schema.comments.score });
      assert(vote_count_result.length === 1);

      const new_vote_count = vote_count_result[0].newVoteCount;
      assert(_.isFinite(new_vote_count));

      result = { success: true, data: { newScore: new_vote_count } };
    });

    ////////////////////////////////////////////////////////////////////////////

    if (result === null) {
      const error_data = { userId, commentId, voteType };
      throw new ApplicationError("Result should not be null", "Failed to process vote", error_data);
    }

    return result;
  };
}
