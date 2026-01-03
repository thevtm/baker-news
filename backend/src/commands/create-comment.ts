import _ from "lodash";
import { z } from "zod";
import { eq } from "drizzle-orm/expressions";
import { sql } from "drizzle-orm";

import { schema, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";

import { CommandReturnType } from "./index.ts";

export interface CreateCommentCommandInput {
  content: string;
  authorId: number;

  postId?: number;
  parentCommentId?: number;
}

export interface CreateCommentReturnData {
  id: number;
}

export type CreateCommentCommandFunction = (
  input: CreateCommentCommandInput
) => Promise<CommandReturnType<CreateCommentReturnData>>;

export function createCreateCommentCommand(db: DBOrTx, queries: Queries): CreateCommentCommandFunction {
  const get_post_id_from_parent_comment_prepared_query = db
    .select({ postId: schema.comments.postId })
    .from(schema.comments)
    .where(eq(schema.comments.id, sql.placeholder("comment_id")))
    .limit(1)
    .prepare("get_post_id_from_parent_comment");

  const get_post_id_from_comment = async (comment_id: number): Promise<number> => {
    const existingComment = await get_post_id_from_parent_comment_prepared_query.execute({ comment_id: comment_id });
    if (existingComment.length === 0) throw new Error("Comment doesn't exist");
    return existingComment[0].postId;
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
    const postId = validation_result.data.postId ?? (await get_post_id_from_comment(parentCommentId!));

    // Create the comment
    const comment: typeof schema.comments.$inferInsert = { content, authorId, postId, parentCommentId };
    const result = await db.insert(schema.comments).values(comment).returning({ id: schema.comments.id });

    return { success: true, data: { id: result[0].id } };
  };
}
