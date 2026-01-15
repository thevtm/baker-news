import _ from "lodash";
import { expect } from "jsr:@std/expect";

import { InitializeDatabaseForTests } from "./helpers/db.ts";
import { disable_leaks_test_options } from "./helpers/disable-leaks-config.ts";

import { seed } from "../src/seed.ts";

Deno.test("seed", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  // Check
  expect(async () => await seed(db)).not.toThrow();

  clear_db();
});
