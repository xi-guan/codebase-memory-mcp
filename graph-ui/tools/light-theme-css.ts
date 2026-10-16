import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { lightPalette } from '../src/styles/light-colors';

/** PostCSS plugin for vite: gives every hard-coded colour under src/ a light value, leaving dark untouched. */
export function lightThemeCss(root: string) {
    const styles = join(root, 'src', 'styles');
    const sources = [join(styles, 'tokens.css'), join(styles, 'theme-light.css')];
    const palette = lightPalette(readFileSync(sources[0], 'utf8'), readFileSync(sources[1], 'utf8'));
    const owned = (file?: string) => file !== undefined && file.startsWith(join(root, 'src') + sep) && !sources.includes(file);
    return {
        postcssPlugin: 'cbm-light-theme',
        Declaration(decl: { prop: string; value: string; source?: { input: { file?: string } } }) {
            if (owned(decl.source?.input.file)) decl.value = palette.lightDark(decl.prop, decl.value);
        },
    };
}
