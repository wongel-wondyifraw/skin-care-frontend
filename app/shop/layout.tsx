import type { Metadata } from "next";
import { ShopAuthProvider } from "@/components/shop/ShopAuthProvider";
import { ShopCartProvider } from "@/components/shop/ShopCartProvider";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopFloatingSupport } from "@/components/shop/ShopFloatingSupport";

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
      <ShopCartProvider>
        <div className="min-h-dvh bg-background flex flex-col relative">
          <ShopHeader />
          <main className="flex-1 px-3 py-4 sm:px-4">{children}</main>
          <ShopFloatingSupport />
        </div>
      </ShopCartProvider>
    </ShopAuthProvider>
  );
}
