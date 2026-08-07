import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback"];

// Roles permitted per top-level route segment. Missing entries = all authenticated roles allowed.
const ROUTE_ROLES: Record<string, UserRole[]> = {
  employees: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director", "auditor"],
  departments: ["super_admin", "hr_manager", "managing_director", "auditor"],
  payroll: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
  loans: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
  reports: ["super_admin", "hr_manager", "finance_manager", "managing_director", "auditor"],
  "audit-logs": ["super_admin", "auditor", "managing_director"],
  settings: ["super_admin", "hr_manager"],
  approvals: ["super_admin", "hr_manager", "finance_manager", "managing_director"],
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user) {
    const segment = path.split("/")[1];
    const allowedRoles = ROUTE_ROLES[segment];
    if (allowedRoles) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile && !allowedRoles.includes(profile.role as UserRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
