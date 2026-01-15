import _ from "lodash";
import { z } from "zod";
import invariant from "tiny-invariant";
import { eq, sql } from "drizzle-orm";
import { CommandReturnType } from "./index.ts";

import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";
import { Events, EventType, UserCreatedCommentEventData } from "../events.ts";

export interface CreateCommentCommandInput {
  content: string;
  authorId: number;

  postId?: number;
  parentCommentId?: number;
}

export interface CreateCommentReturnData {
  comment: typeof schema.comments.$inferSelect;
}

export type CreateCommentCommandFunction = (
  input: CreateCommentCommandInput
) => Promise<CommandReturnType<CreateCommentReturnData>>;

export function createCreateCommentCommand(db: DBOrTx, queries: Queries, events: Events): CreateCommentCommandFunction {
  const get_post_id_from_comment = async (db: DBOrTx, comment_id: number): Promise<number> => {
    const query_response = await db
      .select({ postId: schema.comments.postId })
      .from(schema.comments)
      .where(eq(schema.comments.id, comment_id))
      .limit(1);

    if (query_response.length === 0) throw new Error("Comment doesn't exist");

    return query_response[0].postId;
  };

  //////////////////////////////////////////////////////////////////////////////

  const input_validator = z
    .object({
      content: z.string().trim().min(1, "Content is too short").max(1000, "Content is too long"),

      postId: z
        .number()
        .int()
        .finite("Invalid post ID")
        .positive("Invalid post ID")
        .optional()
        .refine(async (post_id) => post_id === undefined || (await queries.postExists(post_id)), "Post doesn't exist"),

      parentCommentId: z
        .number()
        .int()
        .finite("Invalid comment ID")
        .positive("Invalid comment ID")
        .optional()
        .refine(
          async (comment_id) => comment_id === undefined || (await queries.commentsExists(comment_id)),
          "Comment doesn't exist"
        ),

      authorId: z
        .number()
        .int()
        .finite("Invalid author ID")
        .positive("Invalid author ID")
        .refine(async (author_id) => await queries.userExists(author_id), "Author doesn't exist"),
    })
    .refine((data) => (data.postId !== undefined) !== (data.parentCommentId !== undefined), {
      message: "Either post or parent comment must be provided",
    });

  //////////////////////////////////////////////////////////////////////////////

  return async (input: CreateCommentCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { content, parentCommentId, authorId } = validation_result.data;

    // Execute DB queries
    let new_comment: typeof schema.comments.$inferSelect | undefined = undefined;

    await db.transaction(async (tx) => {
      const postId = validation_result.data.postId ?? (await get_post_id_from_comment(tx, parentCommentId!));

      // Create the comment
      const comment: typeof schema.comments.$inferInsert = { content, authorId, postId, parentCommentId };
      const insert_result = await db.insert(schema.comments).values(comment).returning();

      invariant(insert_result.length === 1, "Comment insert failed");
      new_comment = insert_result[0];

      // Update the comment count on the post
      await tx
        .update(schema.posts)
        .set({ commentsCount: sql`${schema.posts.commentsCount} + 1` })
        .where(eq(schema.posts.id, postId))
        .execute();

      // Update the comment count on the parent comment
      let parent_comment_id: number | undefined = parentCommentId;

      while (parent_comment_id !== undefined) {
        const parent_comment_result = await tx
          .update(schema.comments)
          .set({ commentsCount: sql`${schema.comments.commentsCount} + 1` })
          .where(eq(schema.comments.id, parent_comment_id))
          .returning();

        invariant(parent_comment_result.length === 1);

        parent_comment_id = parent_comment_result[0].parentCommentId ?? undefined;
      }
    });

    invariant(new_comment !== undefined);

    // Emit the event
    const event_data: UserCreatedCommentEventData = { comment: new_comment };
    const event = { type: EventType.USER_CREATED_COMMENT, data: event_data };

    events.dispatch(event);

    // result
    const result_data: CreateCommentReturnData = { comment: new_comment };

    return { success: true, data: result_data };
  };
}
