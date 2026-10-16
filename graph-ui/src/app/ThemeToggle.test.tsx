// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import prePaint from '../../public/theme-init.js?raw';
import ThemeToggle from './ThemeToggle';
import { THEME_STORAGE_KEY } from './theme';

function fakeSystem(light: boolean) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal('matchMedia', () => ({
        matches: light,
        addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    }));
    return (nowLight: boolean) => listeners.forEach(listener => listener({ matches: nowLight } as MediaQueryListEvent));
}

async function mount() {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<ThemeToggle />));
    const pressed = () => host.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label');
    const button = (label: string) => host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    return { pressed, button, unmount: async () => { await act(async () => root.unmount()); host.remove(); } };
}

afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
});

it('pre-paint script: stored choice wins, then the OS, and dark when neither is readable', () => {
    new Function(prePaint)();
    expect(document.documentElement.dataset.theme).toBe('dark');
    fakeSystem(true);
    new Function(prePaint)();
    expect(document.documentElement.dataset.theme).toBe('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    new Function(prePaint)();
    expect(document.documentElement.dataset.theme).toBe('dark');
});

it('switches the whole document and remembers the choice', async () => {
    const view = await mount();
    try {
        expect(view.pressed()).toBe('Dark theme');
        await act(async () => view.button('Light theme').click());
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        expect(view.pressed()).toBe('Light theme');
    } finally { await view.unmount(); }
});

it('follows the OS only until the user picks a theme', async () => {
    const systemChanges = fakeSystem(false);
    const view = await mount();
    try {
        await act(async () => systemChanges(true));
        expect(view.pressed()).toBe('Light theme');
        await act(async () => view.button('Dark theme').click());
        await act(async () => systemChanges(true));
        expect(view.pressed()).toBe('Dark theme');
    } finally { await view.unmount(); }
});
