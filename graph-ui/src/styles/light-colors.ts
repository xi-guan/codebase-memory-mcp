type Rgb = [number, number, number];
interface Color { rgb: Rgb; alpha: number }

const COLOR = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\([^()]*\)/gi;
// strings and url() may hold a '#' that is not a colour
const VERBATIM = /("[^"]*"|'[^']*'|url\([^)]*\))/i;
const NUMBER = /^(\d*\.?\d+)(%?)$/;
const SHADOW_PROPS = new Set(['box-shadow', 'text-shadow', 'filter']);
// near-grey roles: their dark/light lightness pairs shape the curve for every other grey
const NEUTRAL_ROLES = ['bg', 'panel', 'panel-raised', 'line', 'select', 'phosphor-mute', 'dim', 'fg'];
const VIVID_ROLES = ['phosphor', 'cyan', 'alarm'];

// one-off colours the curve gets wrong, dark hex -> light hex
const OVERRIDES: Record<string, string> = {};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function oklch(rgb: Rgb): Rgb {
    const [r, g, b] = rgb.map(toLinear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), Math.atan2(B, A)];
}

function srgb(L: number, C: number, h: number): Rgb | null {
    const A = C * Math.cos(h);
    const B = C * Math.sin(h);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const linear = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (linear.some(c => c < -1e-4 || c > 1 + 1e-4)) return null;
    return linear.map(c => toGamma(clamp(c, 0, 1))) as Rgb;
}

// keeps lightness and hue, gives up chroma until the colour fits sRGB
function fit(L: number, C: number, h: number): Rgb {
    const direct = srgb(L, C, h);
    if (direct) return direct;
    let [lo, hi] = [0, C];
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (srgb(L, mid, h) === null) hi = mid; else lo = mid;
    }
    return srgb(L, lo, h)!;
}

function parse(text: string): Color | null {
    if (text.startsWith('#')) {
        if (!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return null;
        const hex = text.length <= 5 ? [...text.slice(1)].map(c => c + c).join('') : text.slice(1);
        const byte = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
        return { rgb: [byte(0), byte(2), byte(4)], alpha: hex.length === 8 ? byte(6) : 1 };
    }
    const parts = text.slice(text.indexOf('(') + 1, -1).trim().split(/\s*[,/]\s*|\s+/).map(p => NUMBER.exec(p));
    if ((parts.length !== 3 && parts.length !== 4) || parts.some(p => p === null)) return null;
    const [r, g, b, a] = parts.map(p => [parseFloat(p![1]), p![2] === '%'] as const);
    const channel = ([n, pct]: readonly [number, boolean]) => clamp(pct ? n / 100 : n / 255, 0, 1);
    return { rgb: [channel(r), channel(g), channel(b)], alpha: a === undefined ? 1 : clamp(a[1] ? a[0] / 100 : a[0], 0, 1) };
}

const byteHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
const hex = (rgb: Rgb) => `#${rgb.map(byteHex).join('')}`;
const format = ({ rgb, alpha }: Color) =>
    alpha >= 1 ? hex(rgb) : `rgb(${rgb.map(c => Math.round(c * 255)).join(' ')} / ${Number(alpha.toFixed(3))})`;

function roles(css: string): Map<string, Rgb> {
    const found = new Map<string, Rgb>();
    for (const [, role, value] of css.matchAll(/--atlas-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) found.set(role, parse(value)!.rgb);
    return found;
}

function curve(points: Array<[number, number]>): (x: number) => number {
    const sorted = [...points].sort((p, q) => p[0] - q[0]);
    return x => {
        const i = sorted.findIndex(([px]) => px >= x);
        if (i <= 0) return sorted[Math.max(i, 0)][1];
        const [[x0, y0], [x1, y1]] = [sorted[i - 1], sorted[i]];
        return x1 === x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    };
}

export interface LightPalette {
    /** Rewrites every colour literal in a declaration value to `light-dark(<derived light>, <original>)`. */
    lightDark(prop: string, value: string): string;
    /** The light twin of one colour as #rrggbb or #rrggbbaa, for APIs that take no CSS. */
    hex(color: string): string;
}

/** Derives light colours from the dark/light role pairs in tokens.css and theme-light.css. */
export function lightPalette(tokensCss: string, lightCss: string): LightPalette {
    const dark = roles(tokensCss);
    const light = roles(lightCss);
    const pairs = new Map([...dark].filter(([role]) => light.has(role)).map(([role, rgb]) => [hex(rgb), light.get(role)!]));
    const lightness = (table: Map<string, Rgb>, role: string) => oklch(table.get(role)!)[0];
    // black wells sit a step below the light page, white text lands a step past the light ink
    const neutral = curve([
        [0, lightness(light, 'bg') - 0.03],
        [1, lightness(light, 'fg') - 0.07],
        ...NEUTRAL_ROLES.map(r => [lightness(dark, r), lightness(light, r)] as [number, number]),
    ]);
    const vividTarget = VIVID_ROLES.reduce((sum, r) => sum + lightness(light, r), 0) / VIVID_ROLES.length;
    const vivid = (x: number) => (x >= 0.65 ? vividTarget : vividTarget + (0.65 - x) * 0.5);
    const shade = light.get('fg')!;

    function lightOf({ rgb, alpha }: Color, prop: string): Color {
        const key = hex(rgb);
        if (OVERRIDES[key]) return { rgb: parse(OVERRIDES[key])!.rgb, alpha };
        const [l, c, h] = oklch(rgb);
        // translucent black is a shadow or a darkening wash: it stays dark, softer on a light page
        if (alpha < 1 && l < 0.3 && c < 0.05 && (SHADOW_PROPS.has(prop) || alpha < 0.5)) {
            return { rgb: shade, alpha: Math.max(0.04, alpha * (SHADOW_PROPS.has(prop) ? 0.35 : 0.5)) };
        }
        const role = pairs.get(key);
        if (role) return { rgb: role, alpha };
        const weight = clamp((c - 0.04) / 0.08, 0, 1);
        const target = neutral(l) * (1 - weight) + vivid(l) * weight;
        // light surfaces only carry a faint tint
        return { rgb: fit(target, target > 0.85 ? Math.min(c * 0.5, 0.02) : Math.min(c, 0.16), h), alpha };
    }

    return {
        lightDark(prop, value) {
            if (prop.includes('mask') || /light-dark\(/i.test(value)) return value;
            return value.split(VERBATIM).map((part, i) => (i % 2 ? part : part.replace(COLOR, text => {
                const color = parse(text);
                return color ? `light-dark(${format(lightOf(color, prop.toLowerCase()))}, ${text})` : text;
            }))).join('');
        },
        hex(text) {
            const color = parse(text.trim());
            if (!color) return text;
            const light = lightOf(color, 'color');
            return hex(light.rgb) + (light.alpha < 1 ? byteHex(light.alpha) : '');
        },
    };
}
