"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignedOut } from "@/components/layout/session";
import { HOME_ROUTE } from "@/lib/routes";
import { AuthCard, AuthField, AuthInput, authLink, PasswordInput, SubmitButton } from "./auth-ui";

/**
 * Log in, as in EVOQ Projects: this preview has no accounts, so Sign In opens
 * the dashboard without checking the email or password.
 */
export function LoginView() {
  const router = useRouter();
  const [, setSignedOut] = useSignedOut();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setSignedOut(false);
    router.replace(HOME_ROUTE);
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue to EVOQ Inventory."
      footer={
        <>
          New to EVOQ Inventory?{" "}
          <Link href="/sign-up" className={authLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <AuthField id="login-email" label="Email">
          <AuthInput
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </AuthField>
        <AuthField
          id="login-password"
          label="Password"
          aside={
            <Link href="/forgot-password" className={`${authLink} text-[12.5px]`}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>
        <label className="flex items-center gap-2 text-[13px] text-ink-body">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} /> Remember me
        </label>
        <SubmitButton loading={loading} loadingLabel="Signing in…">
          Sign In
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
