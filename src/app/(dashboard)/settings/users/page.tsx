import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRoleSelect } from "@/components/settings/user-role-select";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default async function UserManagementPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage system access and role-based permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
                        <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "success" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.last_login_at ? new Date(p.last_login_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRoleSelect profileId={p.id} role={p.role as UserRole} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
