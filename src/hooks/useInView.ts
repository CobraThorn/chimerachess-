import { useEffect, useRef, useState } from "react";

/**
 * Intersection observer — avoids mounting WASM / heavy UI until section is near viewport.
 */
export function useInView(
  rootMargin = "200px 0px",
  options?: { once?: boolean }
): {
  ref: React.RefObject<HTMLElement | null>;
  inView: boolean;
} {
  const once = options?.once ?? true;
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (once && visible) obs.disconnect();
      },
      { rootMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, once]);

  return { ref, inView };
}
