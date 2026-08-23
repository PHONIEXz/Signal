import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export default function Input({ label, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-navy"
        {...props}
      />
    </div>
  );
}

