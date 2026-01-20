import { expect } from "jsr:@std/expect";

import { createQueries } from "../../src/queries/index.ts";

import { InitializeDatabaseForTests } from "../helpers/db.ts";
import { disable_leaks_test_options } from "../helpers/disable-leaks-config.ts";

Deno.test("PGMQ", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);

  // Create the PGMQ queue
  const queue_name = "test_queue";
  const create_queue_result = await queries.pgmqCreateQueue(queue_name);

  expect(create_queue_result.success).toBe(true);

  // Send a message to the queue
  const message = { test: "message" };
  const send_message_result = await queries.pgmqSendMessage(queue_name, JSON.stringify(message));

  expect(send_message_result.success).toBe(true);
  expect(send_message_result.data).toBeDefined();

  const message_id = send_message_result.data!;

  // Read the message from the queue
  const read_message_result = await queries.pgmqReadMessage(queue_name, 30, 1);

  expect(read_message_result.success).toBe(true);
  expect(read_message_result.data!.length).toBe(1);

  expect(read_message_result.data).toBeDefined();
  expect(read_message_result.data!).toHaveLength(1);

  expect(read_message_result.data![0].msg_id).toBe(message_id);
  expect(read_message_result.data![0].message).toEqual(message);

  // Archive the message
  const archive_message_result = await queries.pgmqArchiveMessage(queue_name, message_id);

  expect(archive_message_result.success).toBe(true);

  // Read the message again to ensure it has been archived
  const read_message_after_archive_result = await queries.pgmqReadMessage(queue_name, 30, 1);

  expect(read_message_after_archive_result.success).toBe(true);
  expect(read_message_after_archive_result.data).toBeDefined();
  expect(read_message_after_archive_result.data!).toHaveLength(0);

  // Clean up
  await clear_db();
});
