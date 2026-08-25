"use client";

import { useActionState } from "react";
import { openGallery, type GateState } from "@/app/admin/actions";
import { copy } from "@/lib/admin-copy";
import { Display, Narrative } from "@/components/ui/typography";

export function GateForm() {
  const [state, action, pending] = useActionState<GateState, FormData>(
    openGallery,
    null,
  );

  return (
    <div className="relative group max-w-md mx-auto w-full">
      <div className="absolute -inset-4 bg-surface-container-low rounded-xl -z-10" />
      <form
        action={action}
        className="border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest rounded-lg p-8 sm:p-12 space-y-8"
      >
        <div className="text-center space-y-4">
          <Display className="text-4xl md:text-5xl">{copy.gateHeading}</Display>
          <Narrative>{copy.gateHint}</Narrative>
        </div>
        <label className="block space-y-2">
          <span className="font-label text-sm uppercase tracking-widest text-secondary">
            {copy.passwordField}
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-on-surface outline-none focus:border-primary/40"
          />
        </label>
        {state?.error ? (
          <p className="text-center text-sm text-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full !bg-primary !text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-70"
        >
          {copy.gateSubmit}
        </button>
      </form>
    </div>
  );
}
