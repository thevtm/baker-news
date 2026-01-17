import { defineProperties, createSprinkles } from "@vanilla-extract/sprinkles";

const space = {
  0: 0,
  1: "0.25rem",
  2: "0.5rem",
  3: "1rem",
  4: "2rem",
  5: "4rem",
  auto: "auto",
  // etc.
};

const sizes = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const weight = {
  thin: 100,
  extraLight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
};

const responsiveProperties = defineProperties({
  conditions: {
    mobile: { "@media": "screen and (min-width: 640px)" },
    tablet: { "@media": "screen and (min-width: 768px)" },
    desktop: { "@media": "screen and (min-width: 1024px)" },
  },

  defaultCondition: "mobile",

  properties: {
    display: ["none", "flex", "block", "inline"],

    flexDirection: ["row", "column"],
    flexGrow: [0, 1],
    justifyContent: ["stretch", "flex-start", "center", "flex-end", "space-around", "space-between"],
    alignItems: ["stretch", "flex-start", "center", "flex-end"],
    alignSelf: ["stretch", "flex-start", "center", "flex-end"],

    width: ["100%"],
    maxWidth: ["640px", "768px", "1024px"],

    marginTop: space,
    marginBottom: space,
    marginLeft: space,
    marginRight: space,

    borderWidth: ["0", "1px"],

    paddingTop: space,
    paddingBottom: space,
    paddingLeft: space,
    paddingRight: space,

    fontSize: sizes,
    fontWeight: weight,

    filter: ["none", "grayscale(100%)"],

    cursor: ["pointer"],
  },

  shorthands: {
    margin: ["marginTop", "marginBottom", "marginLeft", "marginRight"],
    marginX: ["marginLeft", "marginRight"],
    marginY: ["marginTop", "marginBottom"],

    padding: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
  },
});

const colors = {
  none: "none",
  transparent: "transparent",

  black: "#000",
  white: "#fff",

  "blue-50": "#eff6ff",
  "blue-100": "#dbeafe",
  "blue-200": "#bfdbfe",

  "gray-500": "#6a7282",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",

  "orange-100": "#ffedd5",
  "orange-200": "#ffd6a7",
  "orange-800": "#9f2d00",

  "gray-200": "#e5e7eb",
};

const colorProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { "@media": "(prefers-color-scheme: dark)" },
  },
  defaultCondition: "lightMode",
  properties: {
    color: colors,
    background: colors,
    // etc.
  },
});

export const sprinkles = createSprinkles(responsiveProperties, colorProperties);

// It's a good idea to export the Sprinkles type too
export type Sprinkles = Parameters<typeof sprinkles>[0];
