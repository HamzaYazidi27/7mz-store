import type { ReactNode } from "react";
import { AppBar } from "@/components/shell/AppBar";
import { BottomNav } from "@/components/shell/BottomNav";

/**
 * Main shell — screens with the top app bar and floating bottom navigation.
 * Detail screens (product, checkout) live outside this group and use the
 * Telegram back button instead.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-32">
      <AppBar />
      {children}
      <BottomNav />
    </div>
  );
}
