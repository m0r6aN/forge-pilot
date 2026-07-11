import React from "react";

type HeaderBandProps = {
  children: React.ReactNode;
  className?: string;
};

export function HeaderBand({ children, className = "" }: HeaderBandProps) {
  return (
    <header
      data-header-only
      className={[
        "relative w-full overflow-hidden",
        "h-[62px] sm:h-[66px] md:h-[70px] lg:h-[74px]",
        "border-b border-white/10",
        "shadow-[0_1px_0_rgba(255,255,255,0.06)]",
        "bg-[linear-gradient(90deg,rgba(130,140,152,0.22)_0%,rgba(92,102,116,0.16)_50%,rgba(130,140,152,0.22)_100%)] backdrop-blur-md",
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_160%_at_50%_-10%,rgba(56,189,248,0.16),rgba(0,0,0,0)_65%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/15" />
      <div className="relative z-10 flex h-full w-full items-center">{children}</div>
    </header>
  );
}

