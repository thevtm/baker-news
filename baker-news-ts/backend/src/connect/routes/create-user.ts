import { create } from "@bufbuild/protobuf";

import { Commands } from "../../commands/index.ts";
import * as proto from "../../proto/index.ts";

import { map_user } from "../mappers.ts";

export function makeCreateUserRoute(commands: Commands) {
  return async (req: proto.CreateUserRequest): Promise<proto.CreateUserResponse> => {
    const { username } = req;

    const create_user_result = await commands.createUser({ username });

    if (create_user_result.success === false) {
      const error = create(proto.ErrorResponseSchema, { message: create_user_result.error });
      const response = create(proto.CreateUserResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    const user_data = create_user_result.data!;
    const user_proto = map_user(user_data.user);

    const success = create(proto.CreateUserSuccessfulResponseSchema, { user: user_proto });
    const response = create(proto.CreateUserResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
