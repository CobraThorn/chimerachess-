import { HEAT_KIND_ORDER, HEAT_PASTEL } from "../../review/heatPalette";
import type { HeatKind } from "../../review/types";

export default function ReviewHeatLegend({
  activeKinds,
}: {
  activeKinds: Set<HeatKind>;
}) {
  const kinds = HEAT_KIND_ORDER.filter((k) => activeKinds.has(k));
  if (kinds.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {kinds.map((kind) => (
        <span
          key={kind}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[rgba(255,255,255,0.08)] px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] text-[rgba(255,255,255,0.55)] uppercase"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm border"
            style={{
              background: HEAT_PASTEL[kind].fill,
              borderColor: HEAT_PASTEL[kind].ring,
            }}
          />
          {HEAT_PASTEL[kind].label}
        </span>
      ))}
    </div>
  );
}
