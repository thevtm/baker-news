import { Timestamp } from "@bufbuild/protobuf/wkt";

// Not ideal but it works!
export * from "../../../backend/src/proto/index.ts";
export function convertDate(timestamp: Timestamp): Date {
  return new Date(Number(timestamp.seconds * 1000n));
}

export type { Timestamp } from "@bufbuild/protobuf/wkt";
