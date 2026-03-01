import _ from "lodash";

import { InitializeDatabaseForTests } from "./helpers/db.ts";
import { disable_leaks_test_options } from "./helpers/disable-leaks-config.ts";

import { seed } from "../src/seed.ts";

Deno.test("seed", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  // Check
  try {
    await seed(db);
  } catch (error) {
    throw new Error(`Seeding failed: ${error}`);
  }

  await clear_db();
});
