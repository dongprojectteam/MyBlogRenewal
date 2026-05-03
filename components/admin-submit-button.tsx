"use client";

import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className?: string;
};

export function AdminSubmitButton({
  idleText,
  pendingText,
  className = "button",
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingText : idleText}
    </button>
  );
}
