import _ from "lodash";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { assert } from "@std/assert";
import invariant from "tiny-invariant";

import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";
import { Events, EventType, UserVotedPostEventData } from "../events.ts";

import { CommandReturnType } from "./index.ts";

export interface VotePostCommandInput {
  userId: number;
  postId: number;
  voteType: schema.VoteType;
}

export interface VotePostReturnData {
  newScore: number;
  vote: typeof schema.postVotes.$inferSelect;
}

export type VotePostCommandFunction = (input: VotePostCommandInput) => Promise<CommandReturnType<VotePostReturnData>>;

export function createVotePostCommand(db: DBOrTx, queries: Queries, events: Events): VotePostCommandFunction {
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

    voteType: z.enum(schema.voteTypes.enumValues),
  });

  return async (input: VotePostCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { postId, userId, voteType } = validation_result.data;

    ////////////////////////////////////////////////////////////////////////////

    let result: CommandReturnType<VotePostReturnData> | null = null;
    let post: typeof schema.posts.$inferSelect | null = null;
    let vote: typeof schema.postVotes.$inferSelect | null = null;

    await db.transaction(async (tx) => {
      // Check if the user has already voted on the post
      const existing_vote = await tx
        .select()
        .from(schema.postVotes)
        .where(and(eq(schema.postVotes.postId, postId), eq(schema.postVotes.userId, userId)))
        .limit(1);

      const has_voted = existing_vote.length > 0;

      // Insert / update the vote
      if (has_voted) {
        const insert_result = await tx
          .update(schema.postVotes)
          .set({ voteType })
          .where(eq(schema.postVotes.id, existing_vote[0].id))
          .returning();
        vote = insert_result[0];
      } else {
        const update_result = await tx.insert(schema.postVotes).values({ postId, userId, voteType }).returning();
        vote = update_result[0];
      }

      assert(vote !== null);

      // Update post score
      const existingVoteValue = has_voted ? schema.vote_types_values_map.get(existing_vote[0].voteType) : 0;
      assert(existingVoteValue !== undefined);

      const newVoteValue = schema.vote_types_values_map.get(voteType);
      assert(newVoteValue !== undefined);

      const voteDifference = newVoteValue - existingVoteValue;
      assert(voteDifference !== undefined);

      const post_result = await tx
        .update(schema.posts)
        .set({ score: sql`${schema.posts.score} + ${voteDifference}` })
        .where(eq(schema.posts.id, postId))
        .returning();

      assert(post_result.length === 1);

      const vote_count = post_result[0].score;

      assert(_.isFinite(vote_count));

      result = { success: true, data: { newScore: vote_count, vote } };
      post = post_result[0];
    });

    assert(result !== null);

    ////////////////////////////////////////////////////////////////////////////

    // Emit event
    invariant(post !== null && vote !== null);
    const event_data: UserVotedPostEventData = { postVote: vote, post };

    events.dispatch({ type: EventType.USER_VOTED_POST, data: event_data });

    ////////////////////////////////////////////////////////////////////////////

    return result;
  };
}
