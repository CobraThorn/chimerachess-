import { motion } from "framer-motion";
import { useId } from "react";

interface ChimeraBrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Vector brand mark — crisp at nav size, scales cleanly to 4K.
 * Tri-form chimera crest + central intelligence eye.
 */
export default function ChimeraBrandMark({
  size = 40,
  className = "",
}: ChimeraBrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const g = (name: string) => `${name}-${uid}`;

  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
      initial="rest"
      whileHover="hover"
    >
      <defs>
        <linearGradient id={g("gold")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8dc" />
          <stop offset="35%" stopColor="#ffe566" />
          <stop offset="55%" stopColor="#e8c547" />
          <stop offset="100%" stopColor="#8a6f1e" />
        </linearGradient>
        <linearGradient id={g("goldDim")} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8c547" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e8c547" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id={g("iris")} cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#fffef0" />
          <stop offset="25%" stopColor="#ffe566" />
          <stop offset="55%" stopColor="#e8c547" />
          <stop offset="100%" stopColor="#5c4a12" />
        </radialGradient>
        <radialGradient id={g("eyeGlow")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe566" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#e8c547" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#e8c547" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("cyan")} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
          <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
        <filter id={g("glow")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={g("clip")}>
          <path d="M8 10 L56 10 L58 12 L58 52 L56 54 L8 54 L6 52 L6 12 Z" />
        </clipPath>
      </defs>

      {/* Bezel — luxury chronograph frame */}
      <path
        d="M8 10 L56 10 L58 12 L58 52 L56 54 L8 54 L6 52 L6 12 Z"
        fill="rgba(10,10,18,0.85)"
        stroke={`url(#${g("goldDim")})`}
        strokeWidth="0.6"
      />
      <path
        d="M10 12 L54 12 L55 13 L55 51 L54 52 L10 52 L9 51 L9 13 Z"
        fill="none"
        stroke={`url(#${g("gold")})`}
        strokeWidth="0.35"
        opacity="0.45"
      />

      {/* Bezel tick marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 32;
        const cy = 32;
        const r1 = 26;
        const r2 = 28;
        return (
          <line
            key={deg}
            x1={cx + r1 * Math.cos(rad)}
            y1={cy + r1 * Math.sin(rad)}
            x2={cx + r2 * Math.cos(rad)}
            y2={cy + r2 * Math.sin(rad)}
            stroke="#e8c547"
            strokeWidth="0.4"
            opacity="0.25"
          />
        );
      })}

      {/* Tri-form chimera arcs — lion · goat · serpent */}
      <g clipPath={`url(#${g("clip")})`} opacity="0.85">
        <motion.path
          d="M32 14 C18 14 10 24 12 36 C14 44 22 48 32 46"
          fill="none"
          stroke={`url(#${g("gold")})`}
          strokeWidth="1.1"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 1, opacity: 0.55 },
            hover: { pathLength: 1, opacity: 1 },
          }}
        />
        <motion.path
          d="M32 14 C46 14 54 24 52 36 C50 44 42 48 32 46"
          fill="none"
          stroke={`url(#${g("gold")})`}
          strokeWidth="1.1"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 1, opacity: 0.55 },
            hover: { pathLength: 1, opacity: 1 },
          }}
        />
        <motion.path
          d="M32 50 C24 42 20 34 22 26 C24 18 28 14 32 14"
          fill="none"
          stroke={`url(#${g("gold")})`}
          strokeWidth="1.1"
          strokeLinecap="round"
          variants={{
            rest: { pathLength: 1, opacity: 0.45 },
            hover: { pathLength: 1, opacity: 0.95 },
          }}
        />
      </g>

      {/* Inner intelligence ring */}
      <motion.circle
        cx="32"
        cy="32"
        r="14"
        fill="none"
        stroke={`url(#${g("goldDim")})`}
        strokeWidth="0.5"
        strokeDasharray="3 4"
        variants={{
          rest: { rotate: 0 },
          hover: {
            rotate: 360,
            transition: { duration: 12, repeat: Infinity, ease: "linear" },
          },
        }}
        style={{ transformOrigin: "32px 32px" }}
      />

      <motion.circle
        cx="32"
        cy="32"
        r="11"
        fill={`url(#${g("eyeGlow")})`}
        variants={{
          rest: { scale: 1, opacity: 0.5 },
          hover: { scale: 1.15, opacity: 1 },
        }}
        style={{ transformOrigin: "32px 32px" }}
        transition={{ duration: 0.4 }}
      />

      {/* Almond eye — chimera sight */}
      <motion.ellipse
        cx="32"
        cy="32"
        rx="7"
        ry="9"
        fill={`url(#${g("iris")})`}
        filter={`url(#${g("glow")})`}
        variants={{
          rest: { scaleY: 1 },
          hover: { scaleY: 1.06 },
        }}
        style={{ transformOrigin: "32px 32px" }}
      />

      {/* Slit pupil */}
      <motion.ellipse
        cx="32"
        cy="32"
        rx="1.1"
        ry="5.5"
        fill="#050508"
        variants={{
          rest: { scaleY: 1 },
          hover: { scaleY: 1.08, fill: "#0a0a12" },
        }}
        style={{ transformOrigin: "32px 32px" }}
      />

      {/* Cornea highlight */}
      <ellipse cx="29.5" cy="29" rx="1.8" ry="2.2" fill="#fffef0" opacity="0.55" />
      <ellipse cx="34" cy="34.5" rx="0.6" ry="0.8" fill="#fffef0" opacity="0.25" />

      {/* Crown crest — chess royalty */}
      <motion.path
        d="M26 18 L32 12 L38 18 L36 20 L32 16 L28 20 Z"
        fill={`url(#${g("gold")})`}
        opacity="0.7"
        variants={{
          rest: { opacity: 0.5, y: 0 },
          hover: { opacity: 1, y: -0.5 },
        }}
      />

      {/* Cypher C — brand initial woven into serpent tail */}
      <path
        d="M44 40 C40 48 28 50 20 44 C16 40 18 32 24 28"
        fill="none"
        stroke={`url(#${g("gold")})`}
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Hover scan ring */}
      <motion.rect
        x="6"
        y="10"
        width="52"
        height="44"
        fill="none"
        stroke={`url(#${g("cyan")})`}
        strokeWidth="0.8"
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: [0, 0.6, 0] },
        }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      <motion.path
        d="M8 10 L56 10 L58 12 L58 52 L56 54 L8 54 L6 52 L6 12 Z"
        fill="none"
        stroke="#e8c547"
        strokeWidth="0.8"
        variants={{
          rest: { opacity: 0.35 },
          hover: { opacity: 0.95 },
        }}
        filter={`url(#${g("glow")})`}
      />
    </motion.svg>
  );
}
