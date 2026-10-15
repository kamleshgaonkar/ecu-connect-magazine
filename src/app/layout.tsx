import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import { poppins } from "./fonts";
export const metadata: Metadata = {
  title: "ECU Connect · Magazine Builder",
  description: "A considered space to shape your next issue.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
