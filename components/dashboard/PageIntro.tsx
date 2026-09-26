import type { ReactNode } from "react";

export default function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className="page-intro flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[1.08] tracking-[-0.04em] text-ink sm:text-[2.75rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}
