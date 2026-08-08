"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function EmployeePhotoUpload({
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
      toast.error("Please choose a PNG, JPEG, or WebP image");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("employee-photos").upload(path, file, { upsert: false });
    setUploading(false);

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setPreview(value);
      return;
    }

    const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Photo uploaded");
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
          <img src={preview} alt="Employee photo" className="h-full w-full object-cover" />
        ) : (
          <User className="h-8 w-8 text-muted-foreground" />
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
        <p className="text-sm font-medium">Employee Photo</p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 5MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
        >
          {preview ? "Change photo" : "Upload photo"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
    </div>
  );
}
