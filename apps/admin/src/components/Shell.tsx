"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgePercent,
  Image as ImageIcon,
  LayoutGrid,
  LogOut,
  Package,
  Receipt,
  Settings2,
  Tags,
  Users,
} from "lucide-react";
import { Avatar, cn } from "@7mz/ui";
import { useAdminAuth } from "@/stores/admin-auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/users", label: "Customers", icon: Users },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/coupons", label: "Coupons", icon: BadgePercent },
  { href: "/banners", label: "Banners", icon: ImageIcon },
  { href: "/gateways", label: "Payments", icon: Settings2 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, hydrated, clear } = useAdminAuth();

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login");
  }, [hydrated, accessToken, router]);

  // Wait for persisted auth to rehydrate before deciding to redirect.
  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
      </div>
    );
  }
  if (!accessToken) return null;

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-primary">
            <span className="text-sm font-extrabold text-on-primary">7</span>
          </span>
          <span className="font-bold tracking-tight">
            7MZ <span className="text-primary">Admin</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary/12 text-primary" : "text-fg-secondary hover:bg-white/5 hover:text-fg",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            clear();
            router.replace("/login");
          }}
          className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-white/5 hover:text-danger"
        >
          <LogOut className="size-[18px]" /> Log out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-60">
        {/* Mobile top nav */}
        <div className="sticky top-0 z-20 flex items-center gap-2 overflow-x-auto border-b border-border bg-bg/80 px-3 py-2 backdrop-blur-xl md:hidden scrollbar-none">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium",
                  active ? "bg-primary/12 text-primary" : "text-fg-secondary",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>

        <header className="flex items-center justify-end gap-3 px-6 py-4">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight">{user.firstName}</p>
                <p className="text-[11px] text-fg-tertiary">{user.role.replace("_", " ")}</p>
              </div>
              <Avatar src={user.photoUrl} name={user.firstName} size="sm" />
            </div>
          )}
        </header>

        <main className="px-6 pb-16">{children}</main>
      </div>
    </div>
  );
}
