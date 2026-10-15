import localFont from "next/font/local";

/** Application interface font only. Magazine pages and PDFs use their own fonts. */
export const poppins = localFont({
  src: [
    { path: "./fonts/poppins/poppins-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/poppins/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/poppins/poppins-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/poppins/poppins-latin-700-normal.woff2", weight: "700" },
  ],
  style: "normal",
  display: "swap",
  variable: "--font-poppins",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});
