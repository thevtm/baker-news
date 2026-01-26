import { sql } from "drizzle-orm";

import { DBOrTx } from "../db/index.ts";

import { QueryReturnType } from "./index.ts";

export type PGMQCreateQueueQueryFunction = (queue_name: string, tx?: DBOrTx) => Promise<QueryReturnType<void>>;

export type PGMQSendMessageQueryFunction = (
  queue_name: string,
  message: string,
  tx?: DBOrTx
) => Promise<QueryReturnType<string>>;

export type PGMQReadMessageQueryFunction = (
  queue_name: string,
  visibility_timeout: number,
  quantity: number,
  tx?: DBOrTx
) => Promise<QueryReturnType<PGMQMessage[]>>;

export type PGMQReadMessageWithPollQueryFunction = (
  queue_name: string,
  visibility_timeout: number,
  quantity: number,
  tx?: DBOrTx
) => Promise<QueryReturnType<PGMQMessage[]>>;

export type PGMQPopMessageQueryFunction = (
  queue_name: string,
  tx?: DBOrTx
) => Promise<QueryReturnType<PGMQMessage | undefined>>;

export type PGMQDeleteMessageQueryFunction = (
  queue_name: string,
  message_id: string,
  tx?: DBOrTx
) => Promise<QueryReturnType<void>>;

export type PGMQArchiveMessageQueryFunction = (
  queue_name: string,
  message_id: string,
  tx?: DBOrTx
) => Promise<QueryReturnType<void>>;

export interface PGMQMessage {
  msg_id: string;
  read_counter: number;
  enqueued_at: Date;
  visibility_timeout: Date;
  message: object;
}

export function makePGMQCreateQueueQuery(db: DBOrTx): PGMQCreateQueueQueryFunction {
  return async (queue_name, tx = db) => {
    const result = await tx.execute(sql`SELECT * from pgmq.create(${queue_name});`);

    if (result.rowCount === 0) {
      return { success: false, error: "Failed to create queue" };
    }

    return { success: true };
  };
}

export function makePGMQSendMessageQuery(db: DBOrTx): PGMQSendMessageQueryFunction {
  return async (queue_name, message, tx = db) => {
    const result = await tx.execute(sql`SELECT * from pgmq.send(queue_name => ${queue_name}, msg => ${message});`);

    if (result.rowCount === 0) {
      return { success: false, error: "Failed to send message" };
    }

    return { success: true, data: result.rows[0].send as string };
  };
}

export function makePGMQReadMessageQuery(db: DBOrTx): PGMQReadMessageQueryFunction {
  return async (queue_name, visibility_timeout, quantity, tx = db) => {
    const result = await tx.execute(
      sql`SELECT * from pgmq.read(queue_name => ${queue_name}, vt => ${visibility_timeout}, qty => ${quantity});`
    );

    const messages: PGMQMessage[] = result.rows.map(parse_pgmq_message);

    return { success: true, data: messages };
  };
}

export function makePGMQReadMessageWithPollQuery(db: DBOrTx): PGMQReadMessageWithPollQueryFunction {
  return async (queue_name, visibility_timeout, quantity, tx = db) => {
    const result = await tx.execute(
      sql`SELECT * from pgmq.read_with_poll(queue_name => ${queue_name}, vt => ${visibility_timeout}, qty => ${quantity});`
    );

    const messages: PGMQMessage[] = result.rows.map(parse_pgmq_message);

    return { success: true, data: messages };
  };
}

export function makePGMQPopMessageQuery(db: DBOrTx): PGMQPopMessageQueryFunction {
  return async (queue_name, tx = db) => {
    const result = await tx.execute(sql`SELECT * from pgmq.pop(${queue_name});`);

    if (result.rowCount === 0) {
      return { success: true, data: undefined };
    }

    return { success: true, data: parse_pgmq_message(result.rows[0]) };
  };
}

export function makePGMQDeleteMessageQuery(db: DBOrTx): PGMQDeleteMessageQueryFunction {
  return async (queue_name, message_id, tx = db) => {
    const result = await tx.execute(sql`SELECT * from pgmq.delete(${queue_name}, ${message_id});`);

    if (result.rowCount === 0) {
      return { success: false, error: "Failed to delete message" };
    }

    return { success: true };
  };
}

export function makePGMQArchiveMessageQuery(db: DBOrTx): PGMQArchiveMessageQueryFunction {
  return async (queue_name, message_id, tx = db) => {
    const result = await tx.execute(
      sql`SELECT * from pgmq.archive(queue_name => ${queue_name}, msg_id => ${message_id});`
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Failed to archive message" };
    }

    return { success: true };
  };
}

function parse_pgmq_message(row: Record<string, unknown>): PGMQMessage {
  return {
    msg_id: row.msg_id as string,
    read_counter: row.read_ct as number,
    enqueued_at: row.enqueued_at as Date,
    visibility_timeout: row.vt as Date,
    message: row.message as object,
  };
}
