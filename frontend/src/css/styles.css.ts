import { style } from "@vanilla-extract/css";

import { sprinkles } from "./sprinkles.css.ts";

export const container = style([
  sprinkles({
    width: "100%",
    maxWidth: {
      mobile: "640px",
      tablet: "768px",
      desktop: "1024px",
    },
  }),
]);
