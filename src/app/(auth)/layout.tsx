import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-primary p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_30%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 font-bold backdrop-blur">
            L
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">LIBSA</p>
            <p className="text-xs tracking-wide text-white/70">CONSULTANCY</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-semibold leading-tight">
            Human Resources,
            <br />
            beautifully simplified.
          </h1>
          <p className="max-w-md text-white/80">
            Manage employees, attendance, leave, and payroll for LIBSA Consultancy in one secure,
            modern workspace.
          </p>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} LIBSA Consultancy. All rights reserved.</p>
      </div>
      <div className="flex items-center justify-center bg-gradient-subtle p-6 dark:bg-background">{children}</div>
    </div>
  );
}
