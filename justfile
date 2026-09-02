set shell := ["bash", "-euo", "pipefail", "-c"]

bin_name := "codebase-memory-mcp"
install_dir := env_var('HOME') / ".local/bin"

_default:
    @just --list --unsorted --list-heading '' --list-prefix='- '

pull:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! git remote | grep -qx upstream; then
        echo "→ adding upstream remote"
        git remote add upstream "$(gh repo view --json parent --jq .parent.url)"
    fi
    echo "→ syncing fork with upstream"
    # resolve fork from origin: bare `gh repo view` prefers the upstream remote added above
    gh repo sync "$(git remote get-url origin | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')"
    echo "→ pulling from origin with rebase"
    git pull --rebase --autostash origin main
    echo "✓ pull complete"

setup:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "→ checking C toolchain"
    command -v cc >/dev/null || command -v gcc >/dev/null || command -v clang >/dev/null || {
        echo "✗ no C compiler found (macOS: xcode-select --install)" >&2
        exit 1
    }
    echo "→ installing graph-ui dependencies"
    (cd graph-ui && npm ci)
    echo "✓ setup complete"

build:
    scripts/build.sh

test:
    scripts/test.sh

lint:
    #!/usr/bin/env bash
    set -euo pipefail
    make -f Makefile.cbm -j3 lint

install:
    #!/usr/bin/env bash
    set -euo pipefail
    dest="{{install_dir}}/{{bin_name}}"
    if [ -f "$dest" ]; then
        archive_dir="{{install_dir}}/.{{bin_name}}-versions"
        mkdir -p "$archive_dir"
        ver=$("$dest" --version 2>/dev/null | tr -dc 'a-zA-Z0-9._-' || echo "unknown")
        ts=$(date +%Y%m%d%H%M%S)
        echo "→ archiving current install ($ver) for rollback"
        cp "$dest" "$archive_dir/{{bin_name}}-${ver}-${ts}"
    fi
    echo "→ building (with UI)"
    scripts/build.sh --with-ui
    # a running daemon holds the binary open; cp over it fails with ETXTBSY.
    # anchor the pkill to the install path: a bare -f '{{bin_name}}' also matches
    # every process whose argv carries this repo path, vite dev server included
    echo "→ stopping daemon"
    "$dest" daemon stop >/dev/null 2>&1 || true
    pkill -f "^$dest" 2>/dev/null || true
    sleep 1
    echo "→ installing to {{install_dir}}"
    mkdir -p "{{install_dir}}"
    cp build/c/{{bin_name}} "$dest"
    chmod 755 "$dest"
    echo "→ restarting daemon"
    "$dest" daemon start
    echo "✓ installed: $("$dest" --version 2>&1 | tail -1)"

[private]
_install-rollback:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v fzf >/dev/null || { echo "fzf required: brew install fzf" >&2; exit 1; }
    archive_dir="{{install_dir}}/.{{bin_name}}-versions"
    [ -d "$archive_dir" ] || { echo "No archived versions found."; exit 0; }
    sel=$(ls "$archive_dir" | fzf --header="select version to restore")
    [ -n "$sel" ] || exit 0
    cp "$archive_dir/$sel" "{{install_dir}}/{{bin_name}}"
    chmod 755 "{{install_dir}}/{{bin_name}}"
    echo "✓ restored $sel"

rollback: _install-rollback

uninstall:
    #!/usr/bin/env bash
    set -euo pipefail
    dest="{{install_dir}}/{{bin_name}}"
    echo "will remove: $dest, build/c, graph-ui/node_modules, graph-ui/dist"
    read -r -p "proceed? [y/N] " reply
    [ "$reply" = "y" ] || [ "$reply" = "Y" ] || { echo "aborted"; exit 0; }
    if [ -f "$dest" ]; then
        echo "→ removing $dest"
        rm -f "$dest"
    fi
    echo "→ removing build artifacts"
    rm -rf build/c
    rm -rf graph-ui/node_modules graph-ui/dist
    echo "✓ uninstall complete"

reinstall: uninstall setup install

# capture every UI screen + live CSS tokens into docs/design-feed/ for a design tool
design-feed:
    #!/usr/bin/env bash
    set -euo pipefail
    curl -sf -o /dev/null "http://127.0.0.1:9749" || {
        echo "✗ cbm UI backend not on :9749 (run: codebase-memory-mcp --ui=true)" >&2
        exit 1
    }
    curl -sf -o /dev/null "http://localhost:5173" || {
        echo "✗ vite dev server not on :5173 (run: cd graph-ui && npm run dev)" >&2
        exit 1
    }
    node ~/.claude/skills/design-feed/scripts/design-feed.mjs --config docs/design-feed/feed.config.mjs
