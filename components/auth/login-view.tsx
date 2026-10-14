"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthAlert, AuthCard, AuthField, AuthInput, authLink, EMAIL_RE, PasswordInput, simulate, SubmitButton } from "./auth-ui";

type Errors = { email?: string; password?: string };

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (e = email, p = password): Errors => ({
    email: !e.trim() ? "Enter your email address" : !EMAIL_RE.test(e.trim()) ? "Enter a valid email, like name@company.com" : undefined,
    password: !p ? "Enter your password" : undefined,
  });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (errs.email || errs.password) {
      document.getElementById(errs.email ? "login-email" : "login-password")?.focus();
      return;
    }
    setLoading(true);
    await simulate();
    setLoading(false);
    // Nothing was checked: drop the password from memory and explain.
    setPassword("");
    setDone(true);
  };

  const count = Object.values(errors).filter(Boolean).length;

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
      {done ? (
        <div className="space-y-4">
          <AuthAlert tone="info" title="Prototype: no sign-in happened">
            Your details weren&apos;t checked or sent anywhere, and no session was created. You can open the demo workspace — it isn&apos;t protected by this screen.
          </AuthAlert>
          <Link href="/dashboard" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[14.5px] font-medium text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
            Continue to the demo workspace <ArrowRightIcon size={16} weight="bold" aria-hidden />
          </Link>
          <button type="button" onClick={() => setDone(false)} className={`${authLink} block w-full text-center text-[13px]`}>
            Back to sign in
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          {submitted && count > 0 && <AuthAlert tone="error" title={count === 1 ? "1 field needs attention" : `${count} fields need attention`} />}
          <AuthField id="login-email" label="Email" error={errors.email}>
            <AuthInput
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@company.com"
              value={email}
              invalid={!!errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (submitted) setErrors(validate(e.target.value, password));
              }}
            />
          </AuthField>
          <AuthField
            id="login-password"
            label="Password"
            error={errors.password}
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
              invalid={!!errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (submitted) setErrors(validate(email, e.target.value));
              }}
            />
          </AuthField>
          <label className="flex items-center gap-2 text-[13px] text-ink-body">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} /> Remember me
            <span className="text-[12px] text-ink-muted">(not stored in the prototype)</span>
          </label>
          <SubmitButton loading={loading} loadingLabel="Signing in…">
            Sign In
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
