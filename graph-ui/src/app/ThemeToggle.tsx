import type { JSX } from 'react';
import { setTheme, useTheme, type Theme } from './theme';
import { themeStrings } from './theme-strings';
import './theme-toggle.css';

const ICON = { viewBox: '0 0 20 20', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, 'aria-hidden': true };

const OPTIONS: readonly { id: Theme; label: string; icon: JSX.Element }[] = [
    {
        id: 'light', label: themeStrings.light,
        icon: <svg {...ICON}><circle cx="10" cy="10" r="3.5" /><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4" /></svg>,
    },
    {
        id: 'dark', label: themeStrings.dark,
        icon: <svg {...ICON}><path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z" /></svg>,
    },
];

export default function ThemeToggle(): JSX.Element {
    const theme = useTheme();
    return (
        <div className="atlas-theme-toggle" role="group" aria-label={themeStrings.group}>
            {OPTIONS.map((option) => (
                <button type="button" key={option.id} aria-pressed={theme === option.id}
                    aria-label={option.label} title={option.label} onClick={() => setTheme(option.id)}>
                    {option.icon}
                </button>
            ))}
        </div>
    );
}
