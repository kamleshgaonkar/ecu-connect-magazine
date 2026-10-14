import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
