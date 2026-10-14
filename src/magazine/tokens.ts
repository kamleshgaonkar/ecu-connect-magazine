import type { ThemeId } from "../domain/design";
/** Approved Phase 3A baseline. Themes outside blue/yellow are reference-derived base fills. */
export const designTokens = {
  page: {
    widthMm: 210,
    heightMm: 297,
    sideMm: 15,
    contentTopMm: 25,
    contentBottomMm: 272,
    footerBottomMm: 8,
    maxPages: 300,
  },
  colors: {
    blue: "#034EA2",
    yellow: "#FFDD00",
    ink: "#1E1E1E",
    white: "#FFFFFF",
    grey: "#58595B",
  },
  fonts: {
    body: '"ECU Poppins", Poppins, Arial, Helvetica, sans-serif',
    display: '"ECU Bebas", Impact, "Arial Narrow", Arial, sans-serif',
    condensed:
      '"ECU Bebas", "Bebas Neue", Impact, "Arial Narrow", Arial, sans-serif',
  },
  type: {
    bodyPt: 9,
    bodyLeadingPt: 12,
    headerPt: 18.62,
    footerPt: 8,
    folioPt: 11,
  },
} as const;
export type Theme = {
  background: string;
  ink: string;
  accent: string;
  muted: string;
};
export const visualThemes: Record<ThemeId, Theme> = {
  "ecu-light": {
    background: "#F0F7FA",
    ink: "#1E1E1E",
    accent: "#034EA2",
    muted: "#58595B",
  },
  "ecu-blue": {
    background: "#034EA2",
    ink: "#FFFFFF",
    accent: "#FFDD00",
    muted: "#E6EDF6",
  },
  "ecu-dark": {
    background: "#151C22",
    ink: "#FFFFFF",
    accent: "#FFDD00",
    muted: "#E6EDF6",
  },
  cream: {
    background: "#FBF1DD",
    ink: "#1E1E1E",
    accent: "#034EA2",
    muted: "#58595B",
  },
  lavender: {
    background: "#DCD2FF",
    ink: "#1E1E1E",
    accent: "#034EA2",
    muted: "#58595B",
  },
  mint: {
    background: "#DDE6E2",
    ink: "#1E1E1E",
    accent: "#034EA2",
    muted: "#58595B",
  },
  sage: {
    background: "#DBE0D1",
    ink: "#1E1E1E",
    accent: "#034EA2",
    muted: "#58595B",
  },
};
