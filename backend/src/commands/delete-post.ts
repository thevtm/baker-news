import _ from "lodash";
import invariant from "tiny-invariant";
import { eq } from "drizzle-orm/expressions";

import { schema, DBOrTx } from "../db/index.ts";
import { Events } from "../events/index.ts";

import { CommandReturnType } from "./index.ts";

export interface DeletePostCommandInput {
  postId: number;
}

export interface DeletePostReturnData {
  post: typeof schema.posts.$inferSelect;
}

export type DeletePostCommandFunction = (
  input: DeletePostCommandInput
) => Promise<CommandReturnType<DeletePostReturnData>>;

export function createDeletePostCommand(db: DBOrTx, events: Events): DeletePostCommandFunction {
  return async (input: DeletePostCommandInput) => {
    // Validate input
    const post_before_deletion = await db.query.posts.findFirst({
      where: (posts, { eq }) => eq(posts.id, input.postId),
    });

    if (post_before_deletion === undefined) {
      return { success: false, error: "Post not found" };
    }

    if (post_before_deletion.deletedAt !== null) {
      return { success: false, error: "Post already deleted" };
    }

    // Soft delete post
    const result = await db
      .update(schema.posts)
      .set({ deletedAt: new Date() })
      .where(eq(schema.posts.id, input.postId))
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Failed to create post" };
    }

    ////////////////////////////////////////////////////////////////////////////

    // Emit event

    invariant(result.length === 1);
    const post_after_deletion = result[0];

    events.emitUserDeletedPost(post_after_deletion.id);

    ////////////////////////////////////////////////////////////////////////////

    return { success: true, data: { post: post_after_deletion } };
  };
}
