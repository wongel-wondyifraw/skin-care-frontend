import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medaf Skin Care | Admin",
  description: "Medaf Skin Care administration portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
