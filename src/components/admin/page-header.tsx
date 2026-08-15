import type { ReactNode } from "react";

// Shared page header for every admin screen. Product register: the page title is
// Inter (font-sans overrides the base-layer Fraunces on h1) so the admin reads as
// a dense tool, not the editorial storefront. The one Fraunces touch in the admin
// is the sidebar wordmark. Optional actions dock to the right on one line.
export function AdminPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-caption text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}
