import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_logs").insert({
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
