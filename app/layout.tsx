import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yom Bot",
  description: "Discord raid scheduler — manage your guild's schedule",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
