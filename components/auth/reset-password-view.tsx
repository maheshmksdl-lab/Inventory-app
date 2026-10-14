"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { AuthAlert, AuthCard, AuthField, authLink, PASSWORD_RULES, PasswordInput, PasswordRules, simulate, SubmitButton } from "./auth-ui";

type Errors = { password?: string; confirm?: string };

export function ResetPasswordView() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (p = password, c = confirm): Errors => ({
    password: !p ? "Enter a new password" : !PASSWORD_RULES.every((r) => r.test(p)) ? "Password doesn't meet all the requirements" : undefined,
    confirm: !c ? "Confirm the new password" : c !== p ? "Passwords don't match" : undefined,
  });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (errs.password || errs.confirm) {
      document.getElementById(errs.password ? "reset-password" : "reset-confirm")?.focus();
      return;
    }
    setLoading(true);
    await simulate();
    setLoading(false);
    setPassword("");
    setConfirm("");
    setDone(true);
  };

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a strong password you don't use elsewhere."
      footer={
        <Link href="/login" className={`${authLink} inline-flex items-center gap-1.5`}>
          <ArrowLeftIcon size={14} aria-hidden /> Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <AuthAlert tone="info" title="Prototype: password not changed">
            The new password passed validation, but there is no account or backend here, so nothing was changed or saved. The fields have been cleared.
          </AuthAlert>
          <Link href="/login" className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-[14.5px] font-medium text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <AuthAlert tone="info" title="Preview of the reset step">
            Normally you&apos;d reach this screen from an emailed link. Here it&apos;s shown for the full flow; no link token is checked.
          </AuthAlert>
          <AuthField id="reset-password" label="New password" error={errors.password} hint={<PasswordRules value={password} />}>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              value={password}
              invalid={!!errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (submitted) setErrors(validate(e.target.value, confirm));
              }}
            />
          </AuthField>
          {errors.password && <PasswordRules value={password} />}
          <AuthField id="reset-confirm" label="Confirm new password" error={errors.confirm}>
            <PasswordInput
              id="reset-confirm"
              autoComplete="new-password"
              value={confirm}
              invalid={!!errors.confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (submitted) setErrors(validate(password, e.target.value));
              }}
            />
          </AuthField>
          <SubmitButton loading={loading} loadingLabel="Saving…">
            Save New Password
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
