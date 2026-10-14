import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/state-panels";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={CompassIcon}
        title="This page isn't available"
        hint="The link may be wrong, or this module hasn't been built yet."
        action={
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-button text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
          >
            Go to Dashboard
          </Link>
        }
      />
    </div>
  );
}
