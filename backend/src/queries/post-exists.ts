import { eq } from "drizzle-orm/expressions";

import { schema, DBOrTx } from "../db/index.ts";

import { QueryReturnType } from "./index.ts";

export type PostExistsQueryFunction = (post_id: number) => Promise<QueryReturnType<boolean>>;

export function createPostExistsQuery(db: DBOrTx): PostExistsQueryFunction {
  return async (post_id: number) => {
    const result = await db.select().from(schema.posts).where(eq(schema.posts.id, post_id)).limit(1).execute();
    return { success: true, data: result.length !== 0 };
  };
}
