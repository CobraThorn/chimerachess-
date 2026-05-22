import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { PRIMARY_NAV } from "../content/nav";
import ChimeraEmblem from "./nav/ChimeraEmblem";
import MobileDock from "./nav/MobileDock";
import NavDropdown from "./nav/NavDropdown";
import { NavIconButton, UserAvatar } from "./nav/NavIcons";
import PlayChimeraButton from "./nav/PlayChimeraButton";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navOpacity = useTransform(scrollY, [0, 120], [0.85, 1]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 hidden px-4 pt-4 md:block lg:px-6"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.nav
          style={{ opacity: navOpacity }}
          className={`glass-panel relative mx-auto flex max-w-[1440px] items-center gap-4 rounded-sm px-4 py-2.5 transition-all duration-500 lg:px-6 ${
            scrolled
              ? "border-[rgba(232,197,71,0.22)] shadow-[0_0_40px_rgba(232,197,71,0.08)]"
              : ""
          }`}
        >
          {/* Left — brand */}
          <a href="#home" className="group flex shrink-0 items-center gap-3 pr-2">
            <ChimeraEmblem />
            <div>
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.22em] text-gold-glow transition-all duration-300 group-hover:tracking-[0.26em]">
                CHIMERA
              </span>
              <div className="font-[family-name:var(--font-body)] text-[10px] italic tracking-wide text-[rgba(255,255,255,0.35)] transition-colors group-hover:text-[rgba(232,197,71,0.55)]">
                Chess Reimagined
              </div>
            </div>
          </a>

          {/* Center — primary ecosystem */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 lg:gap-x-2">
              {PRIMARY_NAV.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                >
                  <NavDropdown item={item} />
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Right — play + controls */}
          <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
            <PlayChimeraButton />
            <div className="hidden h-6 w-px bg-[rgba(232,197,71,0.15)] sm:block" />
            <NavIconButton name="search" label="Search" href="#search" />
            <NavIconButton name="bell" label="Notifications" href="#notifications" badge={3} />
            <NavIconButton name="messages" label="Messages" href="#social" badge={2} />
            <NavIconButton name="settings" label="Settings" href="#settings" />
            <motion.a
              href="#premium"
              className="btn-cta hidden rounded-sm border border-[rgba(232,197,71,0.45)] bg-gradient-to-br from-[rgba(232,197,71,0.18)] to-[rgba(232,197,71,0.04)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[#ffe566] shadow-[0_0_16px_rgba(232,197,71,0.12)] sm:flex"
              whileHover={{
                boxShadow: "0 0 28px rgba(232,197,71,0.35)",
              }}
            >
              Premium
            </motion.a>
            <div className="mx-1 hidden h-6 w-px bg-[rgba(232,197,71,0.15)] sm:block" />
            <UserAvatar />
          </div>
        </motion.nav>
      </motion.header>

      {/* Mobile — compact top bar + bottom dock */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 md:hidden"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <a href="#home" className="flex items-center gap-2">
          <ChimeraEmblem />
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] text-gold-glow">
            CHIMERA
          </span>
        </a>
        <div className="flex items-center gap-2">
          <PlayChimeraButton compact />
          <NavIconButton name="search" label="Search" href="#search" />
          <NavIconButton name="bell" label="Notifications" href="#notifications" badge={3} />
          <UserAvatar />
        </div>
      </motion.header>

      <MobileDock />
    </>
  );
}
