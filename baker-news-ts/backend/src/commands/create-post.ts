import { z } from "zod";
import _ from "lodash";
import { sql } from "drizzle-orm";
import invariant from "tiny-invariant";
import { eq } from "drizzle-orm/expressions";

import { schema, utils, DBOrTx } from "../db/index.ts";
import { Queries } from "../queries/index.ts";
import { Events } from "../events/index.ts";

import { CommandReturnType } from "./index.ts";

export interface CreatePostCommandInput {
  title: string;
  url: string;
  authorId: number;
}

export interface CreatePostReturnData {
  post: typeof schema.posts.$inferSelect;
}

export type CreatePostCommandFunction = (
  input: CreatePostCommandInput
) => Promise<CommandReturnType<CreatePostReturnData>>;

export function createCreatePostCommand(db: DBOrTx, queries: Queries, events: Events): CreatePostCommandFunction {
  const title_taken_prepared_query = db
    .select()
    .from(schema.posts)
    .where(eq(utils.sql_lower(schema.posts.title), sql.placeholder("title")))
    .limit(1)
    .prepare("post_exists");

  const is_title_available = async (title: string): Promise<boolean> => {
    const existingPost = await title_taken_prepared_query.execute({ title: _.toLower(title) });
    return existingPost.length === 0;
  };

  //////////////////////////////////////////////////////////////////////////////

  const input_validator = z.object({
    title: z
      .string()
      .trim()
      .min(5, "Title is too short")
      .max(100, "Title is too long")
      .regex(/^[a-zA-Z0-9_\.-\s]+$/, "Title can only contain letters, numbers, spaces, dots, dashes, and underscores")
      .refine(async (title) => await is_title_available(title), "Title is not available"),

    url: z.string().trim().max(2048, "URL is too long").url("Invalid URL"),

    authorId: z
      .number()
      .int()
      .finite("Invalid author ID")
      .positive("Invalid author ID")
      .refine(async (author_id) => await queries.userExists(author_id), "Author doesn't exist"),
  });

  //////////////////////////////////////////////////////////////////////////////

  return async (input: CreatePostCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { title, url, authorId } = validation_result.data;

    // Create the post
    const post_inputs: typeof schema.posts.$inferInsert = { title, url: url, authorId: authorId };
    const result = await db.insert(schema.posts).values(post_inputs).returning();

    if (result.length === 0) {
      return { success: false, error: "Failed to create post" };
    }

    ////////////////////////////////////////////////////////////////////////////

    // Emit event

    invariant(result.length === 1);
    const post = result[0];

    await events.emitUserCreatedPost(post.id, post.authorId);

    ////////////////////////////////////////////////////////////////////////////

    return { success: true, data: { post } };
  };
}
