import { redirect } from "next/navigation";
import { LOGIN_ROUTE } from "@/lib/routes";

export default function Root() {
  redirect(LOGIN_ROUTE);
}
