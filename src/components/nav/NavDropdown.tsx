import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { NavDropdownItem, NavItem } from "../../content/nav";

interface NavDropdownProps {
  item: NavItem;
}

export default function NavDropdown({ item }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  if (!item.dropdown) {
    return (
      <a href={item.href} className="nav-link">
        {item.label}
        <span className="nav-link-underline" />
      </a>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className="nav-link flex items-center gap-1 bg-transparent border-0 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {item.label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-[8px] text-[rgba(232,197,71,0.5)]"
        >
          ▾
        </motion.span>
        <span className={`nav-link-underline ${open ? "w-full" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="nav-dropdown glass-panel absolute left-1/2 top-[calc(100%+10px)] z-[60] w-[240px] -translate-x-1/2 overflow-hidden rounded-sm py-2 md:w-[260px]"
          >
            <span className="hud-corner hud-corner--tl" />
            <span className="hud-corner hud-corner--tr" />
            <span className="hud-corner hud-corner--bl" />
            <span className="hud-corner hud-corner--br" />

            <div className="border-b border-[rgba(232,197,71,0.08)] px-4 py-2">
              <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.45)] uppercase">
                {item.label}
              </span>
            </div>

            <ul className="max-h-[320px] overflow-y-auto py-1">
              {item.dropdown.map((entry) => (
                <DropdownLink key={entry.href} entry={entry} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownLink({ entry }: { entry: NavDropdownItem }) {
  return (
    <li>
      <a
        href={entry.href}
        className="group flex items-start justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-[rgba(232,197,71,0.06)]"
      >
        <div className="text-left">
          <span className="block font-[family-name:var(--font-body)] text-xs tracking-wide text-[rgba(255,255,255,0.75)] transition-colors group-hover:text-[rgba(232,197,71,0.95)]">
            {entry.label}
          </span>
          {entry.description && (
            <span className="mt-0.5 block font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.3)]">
              {entry.description}
            </span>
          )}
        </div>
        {entry.badge && (
          <span className="shrink-0 font-[family-name:var(--font-hud)] text-[7px] tracking-wider text-[rgba(0,229,255,0.7)]">
            {entry.badge}
          </span>
        )}
      </a>
    </li>
  );
}
