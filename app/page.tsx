import { redirect } from "next/navigation";
import { HOME_ROUTE } from "@/lib/routes";

export default function Root() {
  redirect(HOME_ROUTE);
}
