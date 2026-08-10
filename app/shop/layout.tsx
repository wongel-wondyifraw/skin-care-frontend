import type { Metadata } from "next";
import { ShopAuthProvider } from "@/components/shop/ShopAuthProvider";
import { ShopHeader } from "@/components/shop/ShopHeader";

export const metadata: Metadata = {
  title: "Medaf Skin Care | Catalog",
  description: "Browse Medaf Skin Care products",
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopAuthProvider>
      <div className="min-h-dvh bg-background flex flex-col">
        <ShopHeader />
        <main className="flex-1 px-3 py-4 sm:px-4">{children}</main>
      </div>
    </ShopAuthProvider>
  );
}
