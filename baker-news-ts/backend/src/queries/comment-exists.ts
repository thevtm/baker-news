import { eq } from "drizzle-orm/expressions";

import { schema, DBOrTx } from "../db/index.ts";

import { QueryReturnType } from "./index.ts";

export type CommentExistsQueryFunction = (comment_id: number) => Promise<QueryReturnType<boolean>>;

export function createCommentExistsQuery(db: DBOrTx): CommentExistsQueryFunction {
  return async (comment_id: number) => {
    const result = await db.select().from(schema.comments).where(eq(schema.comments.id, comment_id)).limit(1).execute();
    return { success: true, data: result.length !== 0 };
  };
}
