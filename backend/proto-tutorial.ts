import { PersonSchema } from "./proto/gen/tutorial_pb.ts";
import { create, toBinary, toJson, fromJsonString } from "@bufbuild/protobuf";

const person = create(PersonSchema, {
  name: "John Doe",
  id: 1234,
  email: "foo@bar.com",
  phones: [{ number: "555-4321" }, { number: "555-1234" }],
  lastUpdated: {
    seconds: BigInt(1234567890),
    nanos: 123456789,
  },
});

const personBytes = toBinary(PersonSchema, person);
const personJson = toJson(PersonSchema, person);

console.log(person);
console.log(personBytes);
console.log(personJson);

const personDeserialized = fromJsonString(PersonSchema, JSON.stringify(personJson));
console.log(personDeserialized);
