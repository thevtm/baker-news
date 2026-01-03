import { MouseEventHandler } from "react";
import { VoteType } from "../state";
import { sprinkles } from "../sprinkles.css";

const voteIcons = {
  [VoteType.Up]: "🔼",
  [VoteType.Down]: "🔽",
};

type VoteButtonProps = {
  voteType: VoteType;
  active: boolean;

  onClick: MouseEventHandler<HTMLButtonElement>;
};

const VoteButton: React.FC<VoteButtonProps> = ({
  onClick,
  voteType,
  active,
}) => {
  const filter = active ? undefined : "grayscale(100%)";

  const style = sprinkles({
    filter,
    background: "transparent",
    borderWidth: "0",
    cursor: "pointer",
  });

  return (
    <button className={style} onClick={onClick}>
      {voteIcons[voteType]}
    </button>
  );
};

export default VoteButton;
