import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createRoutes } from "../../../src/connect/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events/index.ts";
import { createQueries } from "../../../src/queries/index.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("CreateUser", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const events = createEvents(queries);
  const routes = createRoutes(db, events);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  const response = await client.createUser({ username: "test_user" });

  expect(response.result.case).toBe("success");
  expect(response.result.value).not.toBeNull();

  const value = response.result.value as proto.CreateUserSuccessfulResponse;

  expect(value.user).toBeDefined();

  await clear_db();
});
