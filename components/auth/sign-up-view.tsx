"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthAlert, AuthCard, AuthField, AuthInput, authLink, EMAIL_RE, PASSWORD_RULES, PasswordInput, PasswordRules, simulate, SubmitButton } from "./auth-ui";

type Values = { name: string; email: string; company: string; password: string; confirm: string; terms: boolean };
type Errors = Partial<Record<keyof Values, string>>;
const EMPTY: Values = { name: "", email: "", company: "", password: "", confirm: "", terms: false };
const ORDER: (keyof Values)[] = ["name", "email", "company", "password", "confirm", "terms"];

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Enter your full name";
  if (!v.email.trim()) e.email = "Enter your work email";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email, like name@company.com";
  if (v.company.trim().length < 2) e.company = "Enter your company name";
  if (!v.password) e.password = "Create a password";
  else if (!PASSWORD_RULES.every((r) => r.test(v.password))) e.password = "Password doesn't meet all the requirements";
  if (!v.confirm) e.confirm = "Confirm your password";
  else if (v.confirm !== v.password) e.confirm = "Passwords don't match";
  if (!v.terms) e.terms = "Accept the terms and privacy notice to continue";
  return e;
}

export function SignUpView() {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    const next = { ...v, [k]: val };
    setV(next);
    if (submitted) setErrors(validate(next));
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    const errs = validate(v);
    setErrors(errs);
    const first = ORDER.find((k) => errs[k]);
    if (first) {
      document.getElementById(`signup-${first}`)?.focus();
      return;
    }
    setLoading(true);
    await simulate();
    setLoading(false);
    const email = v.email.trim();
    // Passwords are discarded immediately; nothing is kept.
    setV(EMPTY);
    setSubmitted(false);
    setDone(email);
  };

  const count = Object.values(errors).filter(Boolean).length;

  return (
    <AuthCard
      title="Create your account"
      description="Set up EVOQ Inventory for your team. It takes a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLink}>
            Sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="space-y-4">
          <AuthAlert tone="success" title="Form completed">
            Everything you entered for <span className="font-medium text-ink">{done}</span> passed validation.
          </AuthAlert>
          <AuthAlert tone="info" title="Prototype: no account was created">
            Nothing was sent to a server and no verification email was sent. What you typed has been cleared.
          </AuthAlert>
          <Link href="/login" className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-[14px] font-medium text-ink-body transition-colors hover:bg-[#F9FAFB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          {submitted && count > 0 && <AuthAlert tone="error" title={count === 1 ? "1 field needs attention" : `${count} fields need attention`} />}
          <AuthField id="signup-name" label="Full name" error={errors.name}>
            <AuthInput id="signup-name" autoComplete="name" value={v.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
          </AuthField>
          <AuthField id="signup-email" label="Work email" error={errors.email}>
            <AuthInput id="signup-email" type="email" inputMode="email" autoComplete="email" placeholder="name@company.com" value={v.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
          </AuthField>
          <AuthField id="signup-company" label="Company name" error={errors.company}>
            <AuthInput id="signup-company" autoComplete="organization" value={v.company} invalid={!!errors.company} onChange={(e) => set("company", e.target.value)} />
          </AuthField>
          <AuthField id="signup-password" label="Password" error={errors.password} hint={<PasswordRules value={v.password} />}>
            <PasswordInput id="signup-password" autoComplete="new-password" value={v.password} invalid={!!errors.password} onChange={(e) => set("password", e.target.value)} />
          </AuthField>
          {errors.password && <PasswordRules value={v.password} />}
          <AuthField id="signup-confirm" label="Confirm password" error={errors.confirm}>
            <PasswordInput id="signup-confirm" autoComplete="new-password" value={v.confirm} invalid={!!errors.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </AuthField>
          <div>
            <label className="flex items-start gap-2.5 text-[13px] leading-5 text-ink-body">
              <Checkbox id="signup-terms" checked={v.terms} onCheckedChange={(c) => set("terms", c === true)} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "signup-terms-error" : undefined} className="mt-0.5" />
              <span>
                I agree to the <span className="font-medium text-ink">Terms of Service</span> and <span className="font-medium text-ink">Privacy Notice</span>.
              </span>
            </label>
            {errors.terms && (
              <p id="signup-terms-error" className="mt-1 ml-6.5 text-[12px] font-medium text-[#DC2626]">
                {errors.terms}
              </p>
            )}
          </div>
          <SubmitButton loading={loading} loadingLabel="Creating account…">
            Create Account
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
