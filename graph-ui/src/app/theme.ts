import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

// shared with public/theme-init.js, which applies it before first paint
export const THEME_STORAGE_KEY = 'cbm-theme';
const CHANGE = 'cbm-theme-change';
const LIGHT_QUERY = '(prefers-color-scheme: light)';

function storedTheme(): Theme | null {
    try {
        const value = window.localStorage.getItem(THEME_STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch { return null; }
}

/** The attribute on <html> is the one source of truth; the pre-paint script sets it first. */
export function readTheme(): Theme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme): void {
    if (document.documentElement.dataset.theme === theme) return;
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new Event(CHANGE));
}

export function setTheme(theme: Theme): void {
    try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); }
    catch { /* private mode: the choice still holds for this session */ }
    apply(theme);
}

function subscribe(listener: () => void): () => void {
    const query = typeof window.matchMedia === 'function' ? window.matchMedia(LIGHT_QUERY) : null;
    // follow the OS only until the user picks a theme explicitly
    const followSystem = (event: MediaQueryListEvent) => { if (storedTheme() === null) apply(event.matches ? 'light' : 'dark'); };
    window.addEventListener(CHANGE, listener);
    query?.addEventListener('change', followSystem);
    return () => {
        window.removeEventListener(CHANGE, listener);
        query?.removeEventListener('change', followSystem);
    };
}

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, readTheme, () => 'dark');
}
