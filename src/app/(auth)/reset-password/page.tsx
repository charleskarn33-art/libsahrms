"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { updatePassword } from "@/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    const result = await updatePassword(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Password updated. Please sign in.");
    router.push("/login");
  }

  return (
    <div className="w-full max-w-sm animate-fade-in space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:mx-0">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Set a new password</h2>
        <p className="text-sm text-muted-foreground">Choose a strong password you haven&apos;t used before.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
