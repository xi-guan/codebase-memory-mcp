import { describe, expect, it } from 'vitest';
import { lightPalette } from './light-colors';
import { lightDarkStyle, lightHex } from './light-dark';
import lightCss from './theme-light.css?raw';
import tokensCss from './tokens.css?raw';

const map = lightPalette(tokensCss, lightCss).lightDark;
const lightRole = (role: string) => new RegExp(`--atlas-${role}:\\s*(#[0-9a-f]{6})`).exec(lightCss)![1];

const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
const lightPart = (value: string) => /light-dark\((.+), [^,]+\)$/.exec(value)![1];

describe('light colours', () => {
    it('keeps the dark value verbatim as the second light-dark() argument', () => {
        expect(map('color', '#9fb5ab')).toMatch(/^light-dark\(#[0-9a-f]{6}, #9fb5ab\)$/);
        expect(map('border', '1px solid rgba(7,17,12,.65)')).toMatch(/^1px solid light-dark\(rgb\([\d ]+\/ 0\.65\), rgba\(7,17,12,\.65\)\)$/);
    });

    it('sends a role colour to the same role in the light palette', () => {
        expect(map('background', 'rgb(10 14 13)')).toBe(`light-dark(${lightRole('bg')}, rgb(10 14 13))`);
        expect(map('color', '#33ff99')).toBe(`light-dark(${lightRole('phosphor')}, #33ff99)`);
    });

    it('keeps text readable on the light panel', () => {
        const panel = lightRole('panel');
        for (const ink of ['#dce8e1', '#cbdbd0', '#9fb5ab', '#80ac96', '#d6bf81', '#ff637f', '#62dfef', '#ffffff']) {
            expect(contrast(lightPart(map('color', ink)), panel), ink).toBeGreaterThan(4.5);
        }
    });

    it('lightens dark surfaces and darkens light ink', () => {
        expect(luminance(lightPart(map('background', '#111b17')))).toBeGreaterThan(0.8);
        expect(luminance(lightPart(map('color', '#d7e6e0')))).toBeLessThan(0.05);
    });

    it('keeps shadows dark but softer', () => {
        const [, channels, alpha] = /^rgb\(([\d ]+) \/ ([\d.]+)\)$/.exec(lightPart(map('box-shadow', '0 16px 48px #000a')))!;
        expect(Math.max(...channels.split(' ').map(Number))).toBeLessThan(40);
        expect(Number(alpha)).toBeLessThan(0.667);
    });

    it('leaves strings, url(), masks and unparsable colours alone', () => {
        expect(map('content', '"#abc"')).toBe('"#abc"');
        expect(map('mask-image', 'linear-gradient(#000, transparent)')).toBe('linear-gradient(#000, transparent)');
        expect(map('color', 'rgb(var(--x) / 50%)')).toBe('rgb(var(--x) / 50%)');
        expect(map('background', 'url(#a1b) #000')).toMatch(/^url\(#a1b\) light-dark\(/);
    });

    it('gives inline styles and hex-only APIs the same light value as the stylesheets', () => {
        expect(lightDarkStyle({ '--arch-panel': '#0c1613', opacity: 0.5 } as never)).toEqual({ '--arch-panel': map('--arch-panel', '#0c1613'), opacity: 0.5 });
        expect(lightHex('#9fb5ab')).toBe(lightPart(map('color', '#9fb5ab')));
        expect(lightHex('#1d292688')).toMatch(/^#[0-9a-f]{6}88$/);
        expect(lightHex('transparent')).toBe('transparent');
    });
});
