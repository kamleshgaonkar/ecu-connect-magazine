export const templateIds = [
  "feature",
  "dispatch",
  "bulletin",
  "editorial",
  "paper",
  "opener",
] as const;
export type TemplateId = (typeof templateIds)[number];
export const pageMasterIds = ["article", "paper", "opener"] as const;
export type PageMasterId = (typeof pageMasterIds)[number];
export const themeIds = [
  "ecu-light",
  "ecu-blue",
  "ecu-dark",
  "cream",
  "lavender",
  "mint",
  "sage",
] as const;
export type ThemeId = (typeof themeIds)[number];
export const themeLabels: Record<ThemeId, string> = {
  "ecu-light": "ECU light",
  "ecu-blue": "ECU blue",
  "ecu-dark": "Dark feature",
  cream: "Cream",
  lavender: "Lavender",
  mint: "Mint",
  sage: "Sage",
};
