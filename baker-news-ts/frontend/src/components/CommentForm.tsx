import React from "react";
import clsx from "clsx";
import invariant from "tiny-invariant";

import * as proto from "../proto";
import { useUser } from "../queries";
import { useAPIClient } from "../contexts/api-client";

import { container } from "../css/styles.css";
import { sprinkles } from "../css/sprinkles.css";

export interface CommentFormProps {
  parent: proto.CreateCommentRequest["parent"];
  onSuccess?: () => void;
}

enum State {
  IDLE = "IDLE",
  SUBMITTING = "SUBMITTING",
  ERROR = "ERROR",
}

export const CommentForm: React.FC<CommentFormProps> = ({ parent, onSuccess }) => {
  const user = useUser();
  const api_client = useAPIClient();

  const [state, setState] = React.useState<State>(State.IDLE);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<string>("");

  const handle_submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setState(State.SUBMITTING);
    setErrorMessage(null);

    invariant(user.id, "User ID is required");

    const response = await api_client.createComment({ authorId: user.id, parent, content });

    if (response.result.case === "error") {
      setState(State.ERROR);
      setErrorMessage(response.result.value.message);
    }

    if (response.result.case === "success") {
      setState(State.IDLE);
      setContent("");
      onSuccess?.();
    }
  };

  return (
    <div className={clsx(container, sprinkles({ marginX: "auto", paddingY: 1, background: "orange-100" }))}>
      {state === State.ERROR && errorMessage && (
        <div
          className={sprinkles({
            color: "red-500",
            fontSize: "xs",
            textAlign: "center",
            fontWeight: "semiBold",
          })}
        >
          {errorMessage}
        </div>
      )}

      <form
        className={sprinkles({
          display: "flex",
          flexDirection: "column",
          padding: 2,
          paddingX: 3,
        })}
        onSubmit={handle_submit}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={sprinkles({ flexGrow: 1, marginBottom: 2 })}
          disabled={state === State.SUBMITTING}
          rows={4}
        />

        <button
          type="submit"
          className={sprinkles({ flexGrow: 0, alignSelf: "flex-start" })}
          disabled={state === State.SUBMITTING}
        >
          Add comment
        </button>
      </form>
    </div>
  );
};

export default CommentForm;
