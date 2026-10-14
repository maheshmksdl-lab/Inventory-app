"use client";

import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/shared/inventory-ui";

export type MenuAction = { label: string; icon: Icon; href?: string; onSelect?: () => void; destructive?: boolean; separatorBefore?: boolean; disabled?: boolean } | false | null | undefined;

/** "⋯" actions menu on a table row or detail header. */
export function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const list = actions.filter(Boolean) as Exclude<MenuAction, false | null | undefined>[];
  if (!list.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={label} onClick={(e) => e.stopPropagation()}>
          <DotsThreeIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl" onClick={(e) => e.stopPropagation()}>
        {list.map((a) => {
          const IconCmp = a.icon;
          return [
            a.separatorBefore && <DropdownMenuSeparator key={`${a.label}-sep`} />,
            a.href ? (
              <DropdownMenuItem key={a.label} asChild disabled={a.disabled}>
                <Link href={a.href}>
                  <IconCmp aria-hidden /> {a.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={a.label} onSelect={a.onSelect} disabled={a.disabled} variant={a.destructive ? "destructive" : "default"}>
                <IconCmp aria-hidden /> {a.label}
              </DropdownMenuItem>
            ),
          ];
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
