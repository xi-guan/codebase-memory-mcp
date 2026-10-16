// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import ProjectSwitcher from './ProjectSwitcher';
import { recentProjects } from './recent-projects';

const PROJECTS = ['alpha', 'beta', 'gamma', 'delta'].map(name => ({ name, root_path: `/repos/${name}` }));

afterEach(() => localStorage.clear());

async function openWith(current: string, previous: readonly string[]) {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    const render = (name: string) => root.render(<ProjectSwitcher currentProject={name}
        listProjects={() => Promise.resolve(PROJECTS)} onSelectProject={vi.fn()} onAddProject={vi.fn()} />);
    for (const name of [...previous, current]) await act(async () => render(name));
    await act(async () => host.querySelector('summary')!.click());
    const order = [...host.querySelectorAll('.atlas-project-result-name')].map(node => node.firstChild?.textContent);
    await act(async () => root.unmount()); host.remove();
    return order;
}

it('lists the current project, then the ones opened most recently, then the rest by name', async () => {
    expect(await openWith('beta', ['gamma', 'delta'])).toEqual(['beta', 'delta', 'gamma', 'alpha']);
    expect(recentProjects()).toEqual(['beta', 'delta', 'gamma']);
});

it('reads the recents the previous UI left behind', async () => {
    localStorage.setItem('cbm-recent-projects', JSON.stringify([{ name: 'gamma', openedAt: 2 }, { name: 'delta', openedAt: 1 }]));
    expect(await openWith('alpha', [])).toEqual(['alpha', 'gamma', 'delta', 'beta']);
});

it('survives storage it cannot read', async () => {
    localStorage.setItem('cbm-recent-projects', '{broken');
    expect(await openWith('alpha', [])).toEqual(['alpha', 'beta', 'delta', 'gamma']);
});
