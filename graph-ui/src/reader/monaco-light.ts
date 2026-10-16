import type { editor } from 'monaco-editor/editor/editor.api';
import { lightHex } from '../styles/light-dark';

// token rules spell colours without the leading '#'
const bare = (color: string | undefined) => (color === undefined ? undefined : lightHex(`#${color}`).slice(1));

/** The light twin of a dark Monaco theme, every colour through the same mapping as the stylesheets. */
export function lightTheme(dark: editor.IStandaloneThemeData): editor.IStandaloneThemeData {
    return {
        ...dark,
        base: 'vs',
        rules: dark.rules.map(rule => ({ ...rule, foreground: bare(rule.foreground), background: bare(rule.background) })),
        colors: Object.fromEntries(Object.entries(dark.colors).map(([key, value]) => [key, lightHex(value)])),
    };
}
