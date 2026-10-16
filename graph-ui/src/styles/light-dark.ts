import type { CSSProperties } from 'react';
import { lightPalette } from './light-colors';
import lightCss from './theme-light.css?raw';
import tokensCss from './tokens.css?raw';

const palette = lightPalette(tokensCss, lightCss);

/** The light twin of one colour, for APIs such as Monaco that take hex and no CSS. */
export const lightHex = (color: string): string => palette.hex(color);

/** Inline styles skip the build-time CSS pass, so their colours get a light value here. */
export function lightDarkStyle(style: CSSProperties): CSSProperties {
    return Object.fromEntries(Object.entries(style).map(([prop, value]) => [prop, typeof value === 'string' ? palette.lightDark(prop, value) : value]));
}
