"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageToggle } from "./language-toggle";
import { buttonClass } from "@/components/ui/button";

export function MobileMenu({ links, signedIn, home, labels }: { links: { href: string; label: string }[]; signedIn: boolean; home: string; labels: { menu: string; signIn: string; signUp: string; account: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label={labels.menu} aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[min(22rem,88vw)] animate-fade-up flex-col bg-paper p-6 shadow-lift">
            <button type="button" className="ms-auto grid size-10 place-items-center rounded-full hover:bg-sand" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-5" />
            </button>
            <nav className="mt-4 flex flex-col">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="border-b border-line py-4 font-display text-2xl text-ink">
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 pt-8">
              <LanguageToggle large className="w-full justify-center" />
              {signedIn ? (
                <Link href={home} className={buttonClass("primary", "lg", "w-full")}>
                  {labels.account}
                </Link>
              ) : (
                <>
                  <Link href="/register" className={buttonClass("primary", "lg", "w-full")}>
                    {labels.signUp}
                  </Link>
                  <Link href="/login" className={buttonClass("outline", "lg", "w-full")}>
                    {labels.signIn}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
