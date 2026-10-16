import Image from "next/image";
import Link from "next/link";
import { HOME_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Brand assets: the official EVOQ Inventory logo (same family as the Projects
 * app's), and its mark redrawn as SVG so it stays sharp at small sizes.
 */
export const LOGO_SRC = "/brand/evoq-inventory-logo.png";
export const LOGO_WIDTH = 200;
export const LOGO_HEIGHT = 55;
export const MARK_SRC = "/brand/evoq-inventory-mark.svg";

/** The square mark alone (collapsed sidebar, phone header). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src={MARK_SRC} alt="" width={40} height={40} aria-hidden className={cn("size-9 shrink-0 select-none", className)} draggable={false} unoptimized />;
}

/** Full logo in the sidebar and navigation drawer — links to the Dashboard. */
export function AppLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href={HOME_ROUTE} className={cn("inline-flex shrink-0 items-center rounded-md", className)} aria-label="EVOQ Inventory — go to Dashboard">
      {compact ? (
        <LogoMark />
      ) : (
        <Image src={LOGO_SRC} alt="EVOQ Inventory" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className="h-10 w-auto shrink-0 select-none" draggable={false} />
      )}
    </Link>
  );
}
