import type { ReactNode } from "react";
import { getDisplayName } from "../profile/profileUtils";

type IconName =
  | "search"
  | "bell"
  | "messages"
  | "settings"
  | "premium";

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M16.5 16.5 L20 20" strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4 C8 4 6 7 6 10 L6 14 L4 17 L20 17 L18 14 L18 10 C18 7 16 4 12 4 Z" />
      <path d="M10 17 C10 19 11 21 12 21 C13 21 14 19 14 17" />
    </>
  ),
  messages: (
    <>
      <path d="M4 6 L20 6 L20 14 L8 14 L4 18 Z" />
      <path d="M8 10 L16 10" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M4.9 4.9 L7.1 7.1 M16.9 16.9 L19.1 19.1 M4.9 19.1 L7.1 16.9 M16.9 7.1 L19.1 4.9" strokeLinecap="round" />
    </>
  ),
  premium: null,
};

interface NavIconProps {
  name: IconName;
  label: string;
  href?: string;
  badge?: number;
  onClick?: () => void;
}

export function NavIconButton({ name, label, href = "#", badge, onClick }: NavIconProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="nav-icon-btn group relative flex h-9 w-9 items-center justify-center rounded-sm"
    >
      {name === "premium" ? (
        <span className="font-[family-name:var(--font-hud)] text-[8px] font-bold tracking-[0.15em] text-[#ffe566]">
          PRO
        </span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="h-[18px] w-[18px] text-[rgba(232,197,71,0.45)] transition-colors duration-300 group-hover:text-[rgba(232,197,71,0.95)]"
        >
          {paths[name]}
        </svg>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[rgba(232,197,71,0.9)] px-0.5 text-[7px] font-bold text-void">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="nav-icon-glow pointer-events-none absolute inset-0 rounded-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </a>
  );
}

export function UserAvatar({ href = "#profile" }: { href?: string }) {
  const initial = getDisplayName().charAt(0).toUpperCase() || "O";
  return (
    <a
      href={href}
      aria-label="Profile"
      className="nav-icon-btn group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm border border-[rgba(232,197,71,0.35)]"
    >
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(232,197,71,0.2)] to-[rgba(10,10,18,0.9)] font-[family-name:var(--font-display)] text-xs font-bold text-gold-glow">
        {initial}
      </div>
      <span className="nav-icon-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
