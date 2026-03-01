import { DrizzleError } from "npm:drizzle-orm@0.41";

import { db, DBOrTx } from "../../src/db/index.ts";

/**
 * Initializes a database transaction for testing purposes.
 *
 * This function sets up a transactional context for tests, allowing operations
 * to be performed within a transaction that can be rolled back after the test
 * completes. It returns an object containing the database transaction and a
 * function to clear the transaction by triggering a rollback.
 *
 * @returns A promise that resolves to an object containing:
 * - `db`: The database transaction object (`DBOrTx`) to be used in the test.
 * - `clear_db`: A function that, when called, resolves the transaction rollback
 *   and ensures the transaction is properly cleaned up.
 */
export async function InitializeDatabaseForTests(): Promise<{ db: DBOrTx; clear_db: () => Promise<void> }> {
  let result_promise_resolve: (value: DBOrTx) => void;
  const tx_promise = new Promise<DBOrTx>((resolve) => (result_promise_resolve = resolve));

  let clear_db_promise_resolve: () => void;

  const clear_db_promise = new Promise<void>((resolve) => (clear_db_promise_resolve = resolve));

  db.transaction(async (tx) => {
    result_promise_resolve(tx);
    await clear_db_promise;
    tx.rollback();
  }).catch((err) => {
    if (err instanceof DrizzleError && err.message === "Rollback") {
      // Transaction was rolled back, which is expected in this test
    } else {
      throw err; // Rethrow any other errors
    }
  });

  const test_db = await tx_promise;

  return {
    db: test_db,
    clear_db: async () => {
      clear_db_promise_resolve();
      await tx_promise;
    },
  };
}
