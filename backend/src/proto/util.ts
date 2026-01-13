import { create } from "@bufbuild/protobuf";
import { Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";

export function convert_date_to_proto_timestamp(date: Date): Timestamp {
  const seconds = Math.floor(date.getTime() / 1000);
  return create(TimestampSchema, { seconds: BigInt(seconds) });
}
