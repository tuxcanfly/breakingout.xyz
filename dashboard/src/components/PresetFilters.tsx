import { PRESETS } from "../lib/presets"

interface PresetFiltersProps {
  active: string | null
  onChange: (id: string | null) => void
  counts: Record<string, number>
}

export function PresetFilters({ active, onChange, counts }: PresetFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="font-semibold mr-1"
        style={{ color: "var(--sol-base01)", fontSize: "11px" }}
      >
        Presets
      </span>
      {PRESETS.map((preset) => {
        const isActive = active === preset.id
        const count = counts[preset.id] ?? 0
        return (
          <button
            key={preset.id}
            onClick={() => onChange(isActive ? null : preset.id)}
            title={preset.title}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer"
            style={{
              fontSize: "10px",
              border: "1px solid",
              borderColor: isActive ? "transparent" : "var(--sol-base1)",
              backgroundColor: isActive ? "var(--sol-blue)" : "var(--sol-base2)",
              color: isActive ? "#fff" : "var(--sol-base01)",
            }}
          >
            {preset.label}
            <span
              className="inline-flex items-center justify-center rounded-full tabular-nums"
              style={{
                minWidth: 14,
                height: 14,
                padding: "0 3px",
                fontSize: "9px",
                backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--sol-base3)",
                color: isActive ? "#fff" : "var(--sol-base00)",
              }}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
