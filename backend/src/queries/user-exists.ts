import { eq } from "drizzle-orm/expressions";
import { sql } from "drizzle-orm";

import { schema, DBOrTx } from "../db/index.ts";

import { QueryReturnType } from "./index.ts";

export type UserExistsQueryFunction = (user_id: number) => Promise<QueryReturnType<boolean>>;

export function createUserExistQuery(db: DBOrTx): UserExistsQueryFunction {
  const user_exists_prepared_query = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, sql.placeholder("user_id")))
    .limit(1)
    .prepare("user_exists");

  return async (user_id: number) => {
    const existingUser = await user_exists_prepared_query.execute({ user_id: user_id });
    return { success: true, data: existingUser.length !== 0 };
  };
}
