import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

  const variants = {
    primary:
      "bg-navy text-white shadow-lg shadow-navy/15 hover:-translate-y-0.5 hover:bg-navy-dark hover:shadow-xl hover:shadow-navy/20",
    secondary:
      "border border-border bg-surface text-ink shadow-sm hover:-translate-y-0.5 hover:border-navy/30 hover:bg-paper",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
