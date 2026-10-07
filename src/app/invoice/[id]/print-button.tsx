"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("outline", "md")}>
      <Printer /> {label}
    </button>
  );
}
