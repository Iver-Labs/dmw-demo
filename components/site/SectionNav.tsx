"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";

/** Grey section bar under the masthead; scrolls sideways on narrow screens. */
export function SectionNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="border-b border-line bg-[#e9edf4]">
      <ul className="wrap flex gap-1 overflow-x-auto">
        {NAV.map((n) => {
          const current = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <li key={n.href} className="shrink-0">
              <Link
                href={n.href}
                aria-current={current ? "page" : undefined}
                className="flex min-h-12 items-center border-b-2 border-transparent px-3 text-[15px] whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-action aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
