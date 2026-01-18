import React from "react";
import clsx from "clsx";
import invariant from "tiny-invariant";

import { useUser } from "../queries";
import { useAPIClient } from "../contexts/api-client";

import { container } from "../css/styles.css";
import { sprinkles } from "../css/sprinkles.css";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreatePostFormProps {}

enum State {
  IDLE = "IDLE",
  SUBMITTING = "SUBMITTING",
  ERROR = "ERROR",
}

export const CreatePostForm: React.FC<CreatePostFormProps> = () => {
  const user = useUser();
  const api_client = useAPIClient();

  const [state, setState] = React.useState<State>(State.IDLE);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [url, setUrl] = React.useState<string>("");

  const handle_submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setState(State.SUBMITTING);
    setErrorMessage(null);

    invariant(user.id, "User ID is required");

    const response = await api_client.createPost({
      title,
      url,
      authorId: user.id,
    });

    if (response.result.case === "error") {
      setState(State.ERROR);
      setErrorMessage(response.result.value.message);
    }

    if (response.result.case === "success") {
      setState(State.IDLE);
      setTitle("");
      setUrl("");
    }
  };

  return (
    <div className={clsx(container, sprinkles({ marginX: "auto", paddingY: 1, background: "orange-50" }))}>
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
          background: "orange-50",
          display: "flex",
          flexDirection: "row",
          padding: 2,
          alignItems: "center",
          paddingX: 3,
        })}
        onSubmit={handle_submit}
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={sprinkles({ flexGrow: 1 })}
          disabled={state === State.SUBMITTING}
        />

        <input
          type="text"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={sprinkles({ flexGrow: 1, marginX: 1 })}
          disabled={state === State.SUBMITTING}
        />

        <button type="submit">Post</button>
      </form>
    </div>
  );
};

export default CreatePostForm;
