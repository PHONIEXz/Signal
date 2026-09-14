"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; label: string };

export default function PasswordInput({ id, label, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input {...props} id={id} type={visible ? "text" : "password"}
          className={"min-h-12 w-full rounded-xl border border-border bg-surface py-3 pl-4 pr-20 text-base text-ink outline-none transition-colors focus:border-navy focus:ring-4 focus:ring-navy/10 " + className} />
        <button type="button" aria-controls={id} aria-pressed={visible}
          aria-label={(visible ? "Hide " : "Show ") + label.toLowerCase()}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-1 right-1 min-w-16 rounded-lg px-3 text-sm font-semibold text-navy hover:bg-paper">
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
