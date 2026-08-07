"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { positionSchema, type PositionInput } from "@/lib/validations/department";
import { createPosition } from "@/actions/departments";

export function PositionDialog({ departments }: { departments: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PositionInput>({ resolver: zodResolver(positionSchema) });

  async function onSubmit(values: PositionInput) {
    setSubmitting(true);
    const result = await createPosition(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Position created");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" /> Add Position
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Position</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Title</Label>
            <Input {...register("title")} placeholder="e.g. Senior Accountant" />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Department</Label>
            <Controller
              control={control}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Min Salary</Label>
              <Input type="number" step="0.01" {...register("min_salary")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Max Salary</Label>
              <Input type="number" step="0.01" {...register("max_salary")} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Salary Grade</Label>
            <Input {...register("salary_grade")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Position
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
