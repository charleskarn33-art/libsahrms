"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { setCurrentCompany } from "@/actions/company";
import { ROLE_LABELS } from "@/components/layout/nav-config";
import type { MyCompanyRow } from "@/types/database";

export function SelectCompanyPicker({ companies }: { companies: MyCompanyRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSelect(companyId: string) {
    setLoadingId(companyId);
    await setCurrentCompany(companyId);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md animate-fade-in space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl font-semibold tracking-tight">Choose a company</h2>
        <p className="text-sm text-muted-foreground">Select which company you&apos;d like to work in.</p>
      </div>

      <div className="space-y-3">
        {companies.map((c) => (
          <button
            key={c.company_id}
            onClick={() => handleSelect(c.company_id)}
            disabled={!!loadingId}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-elevated disabled:opacity-60"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{ROLE_LABELS[c.role]}</p>
            </div>
            {loadingId === c.company_id ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
