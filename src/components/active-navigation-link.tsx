"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";

export function ActiveNavigationLink({
  href,
  label,
  icon,
  mobile = false,
}: {
  href: string;
  label: string;
  icon: IconName;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        mobile
          ? `flex min-w-max items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
              active
                ? "border-accent-500 text-brand-950"
                : "hover:text-brand-800 border-transparent text-slate-600"
            }`
          : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/12 text-white shadow-sm"
                : "text-brand-100 hover:bg-white/7 hover:text-white"
            }`
      }
      href={href}
    >
      <Icon className="size-5 shrink-0" name={icon} />
      {label}
    </Link>
  );
}
