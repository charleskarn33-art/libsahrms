import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_email, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">A record of every sensitive action taken in the system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {(logs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">{log.entity_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm">{log.actor_email ?? "System"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
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
