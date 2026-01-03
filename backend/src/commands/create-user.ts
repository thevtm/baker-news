import _ from "lodash";
import { z } from "zod";
import { eq } from "drizzle-orm/expressions";
import { sql } from "drizzle-orm";

import { schema, utils, DBOrTx } from "../db/index.ts";

import { CommandReturnType } from "./index.ts";

export interface CreateUserCommandInput {
  username: string;
}

export interface CreateUserReturnData {
  id: number;
}

export type CreateUserCommandFunction = (
  input: CreateUserCommandInput
) => Promise<CommandReturnType<CreateUserReturnData>>;

export function createCreateUserCommand(db: DBOrTx): CreateUserCommandFunction {
  const username_taken_prepared_query = db
    .select()
    .from(schema.users)
    .where(eq(utils.lower(schema.users.username), sql.placeholder("username")))
    .limit(1)
    .prepare("username_taken");

  const is_username_available = async (username: string): Promise<boolean> => {
    const existingUser = await username_taken_prepared_query.execute({ username: _.toLower(username) });
    return existingUser.length === 0;
  };

  //////////////////////////////////////////////////////////////////////////////

  const input_validator = z.object({
    username: z
      .string()
      .trim()
      .min(3, "Username is too short")
      .max(32, "Username is too long")
      .regex(/^[a-zA-Z0-9_\.-]+$/, "Username can only contain letters, numbers, dots, dashes and underscores")
      .refine(async (username) => await is_username_available(username), "Username is not available"),
  });

  //////////////////////////////////////////////////////////////////////////////

  return async (input: CreateUserCommandInput) => {
    // Validate input
    const validation_result = await input_validator.safeParseAsync(input);

    if (!validation_result.success) {
      return { success: false, error: validation_result.error.message };
    }

    const { username } = validation_result.data;

    // Create the user
    const user: typeof schema.users.$inferInsert = { username, role: schema.Roles.USER };
    const result = await db.insert(schema.users).values(user).returning({ id: schema.users.id });

    return { success: true, data: { id: result[0].id } };
  };
}
