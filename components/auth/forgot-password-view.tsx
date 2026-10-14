"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { AuthAlert, AuthCard, AuthField, AuthInput, authLink, EMAIL_RE, simulate, SubmitButton } from "./auth-ui";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const check = (e: string) => (!e.trim() ? "Enter the email you sign in with" : !EMAIL_RE.test(e.trim()) ? "Enter a valid email, like name@company.com" : undefined);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    const err = check(email);
    setError(err);
    if (err) {
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setLoading(true);
    await simulate();
    setLoading(false);
    setSentTo(email.trim());
  };

  const back = (
    <Link href="/login" className={`${authLink} inline-flex items-center gap-1.5`}>
      <ArrowLeftIcon size={14} aria-hidden /> Back to sign in
    </Link>
  );

  return (
    <AuthCard title="Forgot your password?" description="Enter the email you use for EVOQ Inventory. We'll send a link to set a new password." footer={back}>
      {sentTo ? (
        <div className="space-y-4">
          <AuthAlert tone="info" title="Prototype response — no email was sent">
            In a live system, if an account exists for <span className="font-medium text-ink">{sentTo}</span>, a reset link would arrive within a few minutes. This prototype has no email service.
          </AuthAlert>
          <p className="text-[13px] leading-5 text-ink-body">
            To see the next step, open the{" "}
            <Link href="/reset-password" className={authLink}>
              reset password screen
            </Link>{" "}
            that the link would lead to.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setSubmitted(false);
            }}
            className={`${authLink} text-[13px]`}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <AuthField id="forgot-email" label="Email" error={error}>
            <AuthInput
              id="forgot-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              invalid={!!error}
              onChange={(e) => {
                setEmail(e.target.value);
                if (submitted) setError(check(e.target.value));
              }}
            />
          </AuthField>
          <SubmitButton loading={loading} loadingLabel="Sending…">
            Send Reset Link
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
