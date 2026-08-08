"use client";

import { useRef, useState } from "react";
import { Building2, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function CompanyLogoUpload({
  companyId,
  value,
  onChange,
}: {
  companyId: string;
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, WebP, or SVG image");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Logo must be smaller than 5MB");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${companyId}/logo-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: false });
    setUploading(false);

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setPreview(value);
      return;
    }

    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Logo uploaded");
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Company logo" className="h-full w-full object-contain p-2" />
        ) : (
          <Building2 className="h-8 w-8 text-muted-foreground" />
        )}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100",
            uploading && "opacity-100"
          )}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
        </div>
      </button>
      <div>
        <p className="text-sm font-medium">Company Logo</p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, or SVG · up to 5MB · shown on payslips</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
        >
          {preview ? "Change logo" : "Upload logo"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
    </div>
  );
}
