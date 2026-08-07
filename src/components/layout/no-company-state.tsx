import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoCompanyState({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  return (
    <Card className="max-w-md">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">No company access yet</h2>
          <p className="text-sm text-muted-foreground">
            {isPlatformAdmin
              ? "You're a Super Admin but aren't a member of any company yet. Create your first client company to get started."
              : "Your account isn't linked to a company. Ask your HR administrator to add you as an employee or invite you to their company."}
          </p>
        </div>
        {isPlatformAdmin && (
          <Button asChild variant="gradient">
            <Link href="/companies">Create a Company</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
