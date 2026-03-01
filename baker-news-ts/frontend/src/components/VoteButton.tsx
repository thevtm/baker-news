import invariant from "tiny-invariant";
import { MouseEventHandler } from "react";

import { VoteType } from "../proto";

import { sprinkles } from "../css/sprinkles.css";

const voteIcons = new Map<VoteType, string>([
  [VoteType.UP_VOTE, "🔼"],
  [VoteType.DOWN_VOTE, "🔽"],
]);

type VoteButtonProps = {
  voteType: VoteType;
  active: boolean;

  onClick: MouseEventHandler<HTMLButtonElement>;
};

const VoteButton: React.FC<VoteButtonProps> = ({ onClick, voteType, active }) => {
  const filter = active ? undefined : "grayscale(100%)";

  const style = sprinkles({
    filter,
    background: "transparent",
    borderWidth: "0",
    cursor: "pointer",
  });

  const icon = voteIcons.get(voteType);
  invariant(icon !== undefined);

  return (
    <button className={style} onClick={onClick}>
      {icon}
    </button>
  );
};

export default VoteButton;
