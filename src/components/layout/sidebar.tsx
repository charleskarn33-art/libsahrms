"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ITEMS_ADMIN, type NavItem } from "@/components/layout/nav-config";
import type { UserRole } from "@/types/database";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(pathname.startsWith(item.href));
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  if (item.children?.length) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="ml-[1.65rem] mt-1 flex flex-col gap-0.5 border-l border-border pl-4">
            {item.children.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    childActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visible = (items: NavItem[]) => items.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-white shadow-soft">
          L
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">LIBSA</p>
          <p className="text-[10px] font-medium tracking-widest text-muted-foreground">CONSULTANCY</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {visible(NAV_ITEMS).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="my-3 h-px bg-border" />
        {visible(NAV_ITEMS_ADMIN).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="m-3 overflow-hidden rounded-2xl bg-gradient-primary p-5 text-white shadow-elevated">
        <p className="text-sm font-semibold">LIBSA HRMS</p>
        <p className="mt-1 text-xs text-white/75">Human Resource Management System</p>
      </div>
    </aside>
  );
}
