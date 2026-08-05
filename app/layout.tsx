import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Medaf Skin Care | Admin",
  description: "Medaf Skin Care administration portal",
  icons: {
    icon: [{ url: "/medaf_hand.png", type: "image/png" }],
    apple: [{ url: "/medaf_hand.png", type: "image/png" }],
    shortcut: ["/medaf_hand.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
