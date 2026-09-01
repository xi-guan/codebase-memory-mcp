import {
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_LIMITS,
  type DisplaySettings,
} from "../lib/density";
import { useUiMessages } from "../lib/i18n";

interface DisplaySettingsPanelProps {
  settings: DisplaySettings;
  onChange: (next: DisplaySettings) => void;
}

interface SliderRowProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, hint, value, min, max, onChange }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-[12px] text-foreground">{label}</span>
        <span className="font-mono text-[11px] text-primary tabular-nums">
          {value.toFixed(2)}×
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-3.5 m-0 cursor-pointer"
        aria-label={`${label} (${hint})`}
      />
      <span className="text-[11px] leading-[1.4] text-muted-foreground">{hint}</span>
    </label>
  );
}

export function isDefaultDisplay(settings: DisplaySettings): boolean {
  return (
    settings.edgeBrightness === DEFAULT_DISPLAY_SETTINGS.edgeBrightness &&
    settings.nodeGlow === DEFAULT_DISPLAY_SETTINGS.nodeGlow &&
    settings.bloom === DEFAULT_DISPLAY_SETTINGS.bloom
  );
}

/* Contrast / brightness controls for the 3D graph. These ride on top of the
 * automatic density compensation — the defaults already adapt to graph size,
 * so 1.00× is "auto"; the sliders let the user push it. The theme switch used
 * to live here; it is global now and sits in the top bar. */
export function DisplaySettingsPanel({
  settings,
  onChange,
}: DisplaySettingsPanelProps) {
  const t = useUiMessages();
  const set = (patch: Partial<DisplaySettings>) => onChange({ ...settings, ...patch });
  const isDefault = isDefaultDisplay(settings);

  return (
    <div
      role="dialog"
      aria-label={t.graph.displaySettings}
      className="w-[272px] p-3.5 flex flex-col gap-3.5 rounded-[10px] bg-popover border border-border-strong shadow-[0_18px_44px_var(--cbm-shade)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
          {t.graph.contrast}
        </span>
        <button
          onClick={() => onChange(DEFAULT_DISPLAY_SETTINGS)}
          className="text-[11px] text-primary disabled:opacity-30"
          disabled={isDefault}
        >
          {t.common.reset}
        </button>
      </div>

      <SliderRow
        label={t.graph.edgeBrightness}
        hint={t.graph.edgeBrightnessHint}
        value={settings.edgeBrightness}
        min={DISPLAY_LIMITS.edgeBrightness.min}
        max={DISPLAY_LIMITS.edgeBrightness.max}
        onChange={(edgeBrightness) => set({ edgeBrightness })}
      />
      <SliderRow
        label={t.graph.nodeGlow}
        hint={t.graph.nodeGlowHint}
        value={settings.nodeGlow}
        min={DISPLAY_LIMITS.nodeGlow.min}
        max={DISPLAY_LIMITS.nodeGlow.max}
        onChange={(nodeGlow) => set({ nodeGlow })}
      />
      <SliderRow
        label={t.graph.bloom}
        hint={t.graph.bloomHint}
        value={settings.bloom}
        min={DISPLAY_LIMITS.bloom.min}
        max={DISPLAY_LIMITS.bloom.max}
        onChange={(bloom) => set({ bloom })}
      />

      <p className="pt-[11px] border-t border-border text-[11px] leading-[1.5] text-muted-foreground [text-wrap:pretty]">
        {t.graph.displayFootnote}
      </p>
    </div>
  );
}
