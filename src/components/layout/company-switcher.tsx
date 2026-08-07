"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCurrentCompany } from "@/actions/company";
import type { MyCompanyRow } from "@/types/database";

export function CompanySwitcher({ current, companies }: { current: MyCompanyRow; companies: MyCompanyRow[] }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function handleSelect(companyId: string) {
    if (companyId === current.company_id) return;
    setSwitching(true);
    await setCurrentCompany(companyId);
    setSwitching(false);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={switching}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-left outline-none hover:bg-muted disabled:opacity-60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{current.name}</p>
          <p className="text-[11px] capitalize text-muted-foreground">{current.role.replace("_", " ")}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((c) => (
          <DropdownMenuItem key={c.company_id} onClick={() => handleSelect(c.company_id)} className="justify-between">
            <span className="truncate">{c.name}</span>
            {c.company_id === current.company_id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        {current.is_platform_admin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/companies">
                <Plus className="h-4 w-4" /> Manage companies
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
