import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  fullWidth = true,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

  const variants = {
    primary:
      "bg-action text-white shadow-lg shadow-navy/15 hover:-translate-y-0.5 hover:bg-action-hover hover:shadow-xl hover:shadow-navy/20",
    secondary:
      "border border-border bg-surface text-ink shadow-sm hover:-translate-y-0.5 hover:border-navy/30 hover:bg-paper",
  };

  return (
    <button className={`${base} ${fullWidth ? "w-full" : "w-auto"} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
