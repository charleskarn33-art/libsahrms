"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function EmployeePhotoViewer({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  if (!photoUrl) {
    return (
      <Avatar className="h-20 w-20 text-xl">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-20 w-20 text-xl transition-opacity group-hover:opacity-80">
            <AvatarImage src={photoUrl} alt={name} />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">{name}&apos;s photo</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={name} className="w-full rounded-xl object-cover" />
      </DialogContent>
    </Dialog>
  );
}
