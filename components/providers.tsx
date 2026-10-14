"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster
          // Raised above the sticky Save / Cancel bar on form pages, clear of page headers.
          position="bottom-right"
          offset={{ bottom: 84, right: 24 }}
          mobileOffset={{ bottom: 76, right: 12, left: 12 }}
          toastOptions={{
            classNames: {
              toast: "!rounded-[10px] !border-0 !bg-brand-depth !font-semibold !text-white !shadow-pop",
              description: "!font-normal !text-white/80",
              icon: "!text-inventory-hover",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
