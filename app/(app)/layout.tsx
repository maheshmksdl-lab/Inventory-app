import { AppChrome } from "@/components/layout/app-chrome";

/** Every Inventory module page: sidebar, header and content column. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppChrome>{children}</AppChrome>;
}
