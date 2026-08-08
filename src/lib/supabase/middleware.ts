import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CURRENT_COMPANY_COOKIE } from "@/lib/constants";
import type { UserRole } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback"];
const COMPANY_EXEMPT_PATHS = ["/companies", "/settings/users"];

// Roles permitted per top-level route segment, checked against the caller's
// role in the *current* company. Missing entries = any company member allowed.
const ROUTE_ROLES: Record<string, UserRole[]> = {
  employees: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director", "auditor"],
  departments: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director", "auditor"],
  payroll: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
  loans: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
  reports: ["super_admin", "hr_manager", "finance_manager", "managing_director", "auditor"],
  benefits: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director", "auditor"],
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

  if (user && !isPublic) {
    const { data: companies } = await supabase.from("v_my_companies").select("company_id, role");
    const isExempt = COMPANY_EXEMPT_PATHS.some((p) => path.startsWith(p));

    if ((!companies || companies.length === 0) && !isExempt) {
      const url = request.nextUrl.clone();
      url.pathname = "/companies";
      return NextResponse.redirect(url);
    }

    if (companies && companies.length > 0 && !isExempt) {
      const requestedId = request.cookies.get(CURRENT_COMPANY_COOKIE)?.value;
      const current = companies.find((c) => c.company_id === requestedId) ?? companies[0];

      const segment = path.split("/")[1];
      const allowedRoles = ROUTE_ROLES[segment];
      if (allowedRoles && !allowedRoles.includes(current.role as UserRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
