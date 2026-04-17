#!/bin/bash
set -e

# Mission Control Installer for Claude IDE — Windows Edition
# Patches the Claude IDE Electron app (Squirrel install) with the Mission Control dashboard

USERPROFILE_UNIX="/c/Users/ming.huey"
APP_DIR="$USERPROFILE_UNIX/AppData/Local/AnthropicClaude"
# Find the latest app-* directory
APP_VERSION_DIR=$(ls -d "$APP_DIR"/app-* 2>/dev/null | sort -V | tail -1)
ASAR_PATH="$APP_VERSION_DIR/resources/app.asar"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$USERPROFILE_UNIX/.config/claude-ide-mc"
DATA_DIR="$USERPROFILE_UNIX/.memory/mission-control"
WORK_DIR="/tmp/claude-ide-mc-install"

echo "=== Mission Control Installer (Windows) ==="
echo ""

# --- Preflight checks ---
if [ -z "$APP_VERSION_DIR" ] || [ ! -d "$APP_VERSION_DIR" ]; then
  echo "ERROR: Claude IDE Squirrel install not found at $APP_DIR"
  echo "Run: \"Claude Setup.exe\" -exe   to install the Squirrel version."
  exit 1
fi

if [ ! -f "$ASAR_PATH" ]; then
  echo "ERROR: app.asar not found at $ASAR_PATH"
  exit 1
fi

echo "Found Claude IDE at: $APP_VERSION_DIR"
echo "app.asar: $ASAR_PATH"

if ! command -v npx &>/dev/null; then
  echo "ERROR: npx not found. Install Node.js first."
  exit 1
fi

if ! command -v python &>/dev/null; then
  echo "ERROR: python not found."
  exit 1
fi

# --- Kill the app if running ---
echo "Stopping Claude Desktop if running..."
taskkill //F //IM "claude.exe" 2>/dev/null || true
sleep 2

# --- Setup config ---
mkdir -p "$CONFIG_DIR"
mkdir -p "$DATA_DIR"

if [ ! -f "$CONFIG_DIR/config.json" ]; then
  echo "Creating config from template..."
  # Create a Windows-adapted config
  python -c "
import json
with open('$SCRIPT_DIR/config.example.json', 'r') as f:
    config = json.load(f)
# Adapt for Windows
config['claude']['path'] = '$USERPROFILE_UNIX/.local/bin/claude.exe'
with open('$CONFIG_DIR/config.json', 'w') as f:
    json.dump(config, f, indent=2)
"
  echo ""
  echo "IMPORTANT: Edit your config at:"
  echo "  $CONFIG_DIR/config.json"
  echo ""
else
  echo "Config already exists at $CONFIG_DIR/config.json"
fi

# Assemble standalone dashboard HTML from parts
echo "Building dashboard HTML..."
python -c "
with open('$SCRIPT_DIR/src/dashboard-shell.html', 'r') as f:
    html = f.read()
with open('$SCRIPT_DIR/src/dashboard-styles.css', 'r') as f:
    css = f.read()
with open('$SCRIPT_DIR/src/dashboard-app.js', 'r') as f:
    js = f.read()
html = html.replace('/* __MC_CSS__ */', css)
html = html.replace('/* __MC_JS__ */', js)
with open('$CONFIG_DIR/dashboard.html', 'w') as f:
    f.write(html)
print('  Assembled dashboard.html (' + str(len(html)) + ' bytes)')
"

# --- Extract and patch ---
CLEAN_ASAR="$ASAR_PATH"
if [ -f "$APP_VERSION_DIR/resources/app.asar.pre-patch" ]; then
  CLEAN_ASAR="$APP_VERSION_DIR/resources/app.asar.pre-patch"
  echo "Using clean backup: app.asar.pre-patch"
fi

echo "Backing up clean app.asar..."
if [ ! -f "$APP_VERSION_DIR/resources/app.asar.pre-patch" ]; then
  cp "$ASAR_PATH" "$APP_VERSION_DIR/resources/app.asar.pre-patch"
fi

echo "Extracting app..."
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/extract"
npx asar extract "$CLEAN_ASAR" "$WORK_DIR/extract"

# Backup clean renderer for future patches
cp "$WORK_DIR/extract/out/renderer/assets/"*.js "$WORK_DIR/" 2>/dev/null || true

echo "Stripping previous MC patches (if any)..."
MAIN_JS="$WORK_DIR/extract/out/main/index.js"
PRELOAD_JS="$WORK_DIR/extract/out/preload/index.js"
RENDERER_JS=$(ls "$WORK_DIR/extract/out/renderer/assets/"index-*.js 2>/dev/null | head -1)

# Strip old MC injections
python -c "
import re

# --- Main process ---
with open('$MAIN_JS', 'r') as f:
    main = f.read()
pattern = r'\n*// --- Mission Control Handlers \(injected\) ---.*?// --- End Mission Control Handlers ---(?:\n\})?'
count = len(re.findall(pattern, main, re.DOTALL))
main = re.sub(pattern, '', main, flags=re.DOTALL)
if count:
    print(f'  Stripped {count} old main process MC patch(es)')
mc_count = len(re.findall(r'electron\.ipcMain\.handle\(\"mc:', main))
if mc_count:
    main = re.sub(r'\n  electron\.ipcMain\.handle\(\"mc:[^\"]+\".*?\n  \}\);', '', main, flags=re.DOTALL)
    print(f'  Stripped {mc_count} embedded mc: handlers')
main = main.replace('    return id;\n  });\n  });\n', '    return id;\n  });\n}\n')
with open('$MAIN_JS', 'w') as f:
    f.write(main)

# --- Preload ---
with open('$PRELOAD_JS', 'r') as f:
    preload = f.read()
preload = re.sub(r'\n*// Mission Control.*?Preload API[^\n]*\n// [^\n]*\n\n?', '\n', preload, flags=re.DOTALL)
lines = preload.split('\n')
stripped = [l for l in lines if not re.match(r'^\s+(mc[A-Z]\w+|getHomePath)\s*:', l)]
removed = len(lines) - len(stripped)
preload = '\n'.join(stripped)
preload = re.sub(r'(\w[^\n]*[^,\s])\n(\s*\}\s*;)', r'\1\n\2', preload)
if removed:
    print(f'  Stripped {removed} old preload mc/getHomePath lines')
with open('$PRELOAD_JS', 'w') as f:
    f.write(preload)

# --- Renderer ---
with open('$RENDERER_JS', 'r') as f:
    renderer = f.read()
renderer = re.sub(r'[^\n]*_mcKbd[^\n]*\n', '', renderer)
pt = renderer.find('function parseTodos')
sb = renderer.find('function StatusBar')
if pt >= 0 and sb > pt:
    line_start = renderer.rfind('\n', 0, pt) + 1
    renderer = renderer[:line_start] + renderer[sb:]
    print('  Stripped old renderer MC patch')
with open('$RENDERER_JS', 'w') as f:
    f.write(renderer)
" 2>&1

echo "Patching main process..."

# Create a Windows-adapted version of main-handlers.js
# Replace macOS paths/shell references with Windows equivalents
python -c "
with open('$SCRIPT_DIR/src/main-handlers.js', 'r') as f:
    handlers = f.read()

# Fix HOME -> USERPROFILE for Windows
handlers = handlers.replace(
    'process.env.HOME || \"\"',
    'process.env.USERPROFILE || process.env.HOME || \"\"'
)
handlers = handlers.replace(
    'process.env.HOME || \"/tmp\"',
    'process.env.USERPROFILE || process.env.HOME || process.env.TEMP || \"C:\\\\Temp\"'
)

# Fix PATH construction: use semicolons and Windows paths
handlers = handlers.replace(
    'PATH: \"/opt/homebrew/bin:\" + (process.env.HOME || \"\") + \"/.local/bin:\" + (process.env.PATH || \"\")',
    'PATH: (process.env.USERPROFILE || process.env.HOME || \"\") + \"/.local/bin;\" + (process.env.USERPROFILE || process.env.HOME || \"\") + \"/AppData/Local/Programs/Python/Python311;\" + (process.env.PATH || \"\")'
)
handlers = handlers.replace(
    'PATH: (process.env.HOME || \"\") + \"/.local/bin:\" + (process.env.PATH || \"\")',
    'PATH: (process.env.USERPROFILE || process.env.HOME || \"\") + \"/.local/bin;\" + (process.env.PATH || \"\")'
)

# Fix default claude path
handlers = handlers.replace(
    'return config.claude?.path || \"/opt/homebrew/bin/claude\";',
    'return config.claude?.path || (process.env.USERPROFILE || process.env.HOME || \"\") + \"/.local/bin/claude.exe\";'
)

# Fix shell spawning: use cmd.exe on Windows instead of zsh
handlers = handlers.replace(
    'const shell = process.env.SHELL || \"/bin/zsh\";',
    'const shell = process.platform === \"win32\" ? \"cmd.exe\" : (process.env.SHELL || \"/bin/zsh\");'
)

# Fix shell command execution for Windows
# Replace the spawn with login shell approach
old_spawn = 'const proc = child_process.spawn(shell, [\"-l\", \"-c\", shellCmd]'
new_spawn = 'const proc = process.platform === \"win32\" ? child_process.spawn(shell, [\"/c\", shellCmd]) : child_process.spawn(shell, [\"-l\", \"-c\", shellCmd]'
handlers = handlers.replace(old_spawn, new_spawn)

# Fix pty spawn for Windows
handlers = handlers.replace(
    'const shell = process.env.SHELL || \"/bin/zsh\";\n  const ptyProcess = pty__namespace.spawn(shell, [\"-l\"],',
    'const shell = process.platform === \"win32\" ? \"cmd.exe\" : (process.env.SHELL || \"/bin/zsh\");\n  const ptyProcess = process.platform === \"win32\" ? pty__namespace.spawn(shell, [],'
)

with open('$WORK_DIR/main-handlers-win.js', 'w') as f:
    f.write(handlers)
print('  Created Windows-adapted main-handlers.js')
"

# Find the injection point
INJECT_MARKER="function createWindow()"
INJECT_LINE=$(grep -n "$INJECT_MARKER" "$MAIN_JS" | head -1 | cut -d: -f1)

if [ -z "$INJECT_LINE" ]; then
  echo "ERROR: Could not find injection point in main process."
  exit 1
fi

{
  head -$((INJECT_LINE - 1)) "$MAIN_JS"
  echo ""
  echo "// --- Mission Control Handlers (injected) ---"
  cat "$WORK_DIR/main-handlers-win.js"
  echo ""
  echo "// --- End Mission Control Handlers ---"
  tail -n "+$INJECT_LINE" "$MAIN_JS"
} > "$MAIN_JS.tmp"
mv "$MAIN_JS.tmp" "$MAIN_JS"

echo "Patching preload..."
# Insert preload APIs before the closing }; of the api object
python -c "
import re
with open('$PRELOAD_JS', 'r') as f:
    content = f.read()
with open('$SCRIPT_DIR/src/preload-apis.js', 'r') as f:
    apis = f.read()

# Fix HOME for Windows in preload
apis = apis.replace(
    'process.env.HOME || require(\"os\").homedir()',
    'process.env.USERPROFILE || process.env.HOME || require(\"os\").homedir()'
)

# Find the last }; before contextBridge line
content = content.replace('};\nelectron.contextBridge', apis + '};\nelectron.contextBridge')
with open('$PRELOAD_JS', 'w') as f:
    f.write(content)
print('  Injected preload APIs')
"

echo "Patching dashboard..."
if [ -z "$RENDERER_JS" ]; then
  echo "ERROR: Could not find renderer JS."
  exit 1
fi

START_LINE=$(grep -n "function parseTodos" "$RENDERER_JS" | head -1 | cut -d: -f1)
END_LINE=$(grep -n "function StatusBar" "$RENDERER_JS" | head -1 | cut -d: -f1)

if [ -z "$END_LINE" ]; then
  echo "ERROR: Could not find StatusBar in renderer."
  exit 1
fi

SPLICE_BEFORE=${START_LINE:-$END_LINE}

{
  head -$((SPLICE_BEFORE - 1)) "$RENDERER_JS"
  cat "$SCRIPT_DIR/src/dashboard-bridge.js"
  echo ""
  tail -n "+$END_LINE" "$RENDERER_JS"
} > "$RENDERER_JS.tmp"
mv "$RENDERER_JS.tmp" "$RENDERER_JS"

echo "Applying renderer tweaks..."
python -c "
with open('$RENDERER_JS', 'r') as f:
    r = f.read()

# 1. Hide file explorer sidebar by default
r = r.replace('sidebarOpen: true,', 'sidebarOpen: false,')

# 1b. Prevent FileExplorer from scanning when sidebar closed
r = r.replace(
    'function useFileTree(projectPath) {',
    'function useFileTree(projectPath, sidebarOpen) {\n  if (!sidebarOpen) return { tree: [], gitStatuses: {} };'
)
r = r.replace(
    'const { tree, gitStatuses } = useFileTree(state.projectPath);',
    'const { tree, gitStatuses } = useFileTree(state.projectPath, state.sidebarOpen);'
)

# 2. Auto-set project path to home dir, skip watchProject
target = '''dispatch({ type: \"SET_PROJECT_PATH\", path: dir });
          await window.api.watchProject(dir);
          await window.api.addRecentSession(dir);
          const branch = await window.api.getGitBranch(dir);
          dispatch({ type: \"SET_GIT_BRANCH\", branch });'''
replacement = '''dispatch({ type: \"SET_PROJECT_PATH\", path: dir });
          await window.api.addRecentSession(dir);'''
r = r.replace(target, replacement)

import re as _re_wp
r = _re_wp.sub(r'\n\s*await window\.api\.watchProject\(dir\);', '', r)

r = r.replace(
    'const dir = await window.api.selectDirectory();\n        if (dir) {',
    \"const dir = await window.api.getHomePath() || process.env.USERPROFILE || 'C:\\\\\\\\Users\\\\\\\\ming.huey';\n        if (dir) {\"
)

import os as _os
_home = _os.environ.get('USERPROFILE', _os.environ.get('HOME', 'C:\\\\Users\\\\ming.huey')).replace('\\\\', '/')
r = r.replace(
    'if (sessions.length > 0) return;',
    \"if (sessions.length > 0) { dispatch({ type: 'SET_PROJECT_PATH', path: await window.api.getHomePath() || '\" + _home + \"' }); return; }\"
)

# 3. Fix terminal layout
import re as _re_fit

_term_style_old = 'width: \"100%\",\n        height: \"100%\",\n        display: visible ? \"block\" : \"none\",\n        background: \"#1e1e1e\"'
_term_style_new = 'flex: visible ? 1 : \"none\",\n        width: \"100%\",\n        minHeight: 0,\n        overflow: \"hidden\",\n        display: visible ? \"flex\" : \"none\",\n        background: \"#1e1e1e\"'
if _term_style_old in r:
    r = r.replace(_term_style_old, _term_style_new)
    print('  Patched TerminalTab container')
elif 'flex: visible ? 1 : \"none\"' in r:
    print('  TerminalTab container already patched')
else:
    print('  WARN: Could not find TerminalTab style to patch')

# 3a. Delayed fit
r = _re_fit.sub(r'\n\s*setTimeout\(\(\) => \{ try \{ fitAddon\.fit\(\).*?\}, \d+\);', '', r)
_fit_target = 'terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
if _fit_target not in r:
    _fit_target = 'terminal.open(containerRef.current);\n    fitAddon.fit();\n    terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
    if _fit_target in r:
        r = r.replace(_fit_target, 'terminal.open(containerRef.current);\n    terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;')
_fit_insert = 'terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
if _fit_insert in r:
    r = r.replace(_fit_insert, _fit_insert + '\n    var _fitDone = false;\n    function _doFit() { try { var el = containerRef.current; if (!el || el.offsetWidth < 100) return; fitAddon.fit(); _fitDone = true; } catch(e) {} }\n    setTimeout(_doFit, 50);\n    setTimeout(_doFit, 200);\n    setTimeout(_doFit, 500);\n    setTimeout(_doFit, 1000);\n    setTimeout(_doFit, 2500);')
    print('  Patched initial fit (delayed, 5 stages)')

# 3a2. First-data fit
_data_target = 'if (id2 === ptyId) {\n        terminal.write(data);\n      }'
_data_replace = 'if (id2 === ptyId) {\n        terminal.write(data);\n        if (!_fitDone) { _fitDone = true; setTimeout(_doFit, 0); setTimeout(_doFit, 100); }\n      }'
if _data_target in r:
    r = r.replace(_data_target, _data_replace)
    print('  Patched first-data fit')

# 3b. Remove immediate resizePty
if 'window.api.resizePty(ptyId, terminal.cols, terminal.rows);\n    const resizeObserver' in r:
    r = r.replace(
        'window.api.resizePty(ptyId, terminal.cols, terminal.rows);\n    const resizeObserver',
        'const resizeObserver'
    )
    print('  Removed immediate resizePty')

# 3c. ResizeObserver with scrollToBottom
if 'ResizeObserver(() => {\n      fitAddon.fit();\n    })' in r:
    r = r.replace(
        'const resizeObserver = new ResizeObserver(() => {\n      fitAddon.fit();\n    });',
        'const resizeObserver = new ResizeObserver(() => {\n      try { var el = containerRef.current; if (el && el.offsetWidth > 100) { fitAddon.fit(); terminal.scrollToBottom(); } } catch(e) {}\n    });'
    )
    print('  Patched ResizeObserver')

# 3d. Visibility effect
r = _re_fit.sub(r'\n\s*setTimeout\(\(\) => \{ fitAddonRef\.current\?\.fit\(\).*?\}, \d+\);', '', r)
r = r.replace('setTimeout(() => fitAddonRef.current?.fit(), 0);\n    ', '')
_vis_old = 'if (visible && fitAddonRef.current) {\n    }'
_vis_old2 = 'if (visible && fitAddonRef.current) {\n      \n    }'
_vis_new = 'if (visible && fitAddonRef.current) {\n      function _vfit() { try { var el = containerRef.current; if (el && el.offsetWidth > 100) { fitAddonRef.current?.fit(); if (terminalRef.current) terminalRef.current.scrollToBottom(); } } catch(e) {} }\n      setTimeout(_vfit, 50);\n      setTimeout(_vfit, 200);\n      setTimeout(_vfit, 500);\n      setTimeout(_vfit, 1000);\n    }'
if _vis_old in r:
    r = r.replace(_vis_old, _vis_new)
    print('  Patched visibility effect')
elif _vis_old2 in r:
    r = r.replace(_vis_old2, _vis_new)
    print('  Patched visibility effect')

# 5. Ctrl+D to toggle dashboard (Ctrl instead of Cmd on Windows)
_kbd_hook = '  reactExports.useEffect(function() { function _mcKbd(e) { if (e.ctrlKey) { if (e.key === \"d\") { e.preventDefault(); dispatch({ type: \"SET_ACTIVE_TAB\", tabId: \"dashboard\" }); } if (e.key === \"t\") { e.preventDefault(); var pp = state.projectPath || process.env.USERPROFILE || \"C:\\\\Users\\\\ming.huey\"; var tid = \"terminal-\" + Date.now(); var lbl = pp.split(/[\\\\/]/).pop() || \"Terminal\"; window.api.createPty(pp).then(function(ptyId) { dispatch({ type: \"ADD_TAB\", tab: { id: tid, type: \"terminal\", label: lbl, closeable: true, ptyId: ptyId, projectPath: pp } }); }); } } } document.addEventListener(\"keydown\", _mcKbd); return function() { document.removeEventListener(\"keydown\", _mcKbd); }; }, [dispatch, state.projectPath]);\n'
_target = 'useClaudeStatus();\n'
_ti = r.find(_target)
if _ti >= 0:
    _insert_at = _ti + len(_target)
    r = r[:_insert_at] + _kbd_hook + r[_insert_at:]
    print('  Patched Ctrl+D shortcut')

with open('$RENDERER_JS', 'w') as f:
    f.write(r)
print('  Applied renderer tweaks')
"

# Skip TCC patch (macOS-only, not needed on Windows)
echo "Skipping TCC patch (not needed on Windows)..."

# Append drag-and-drop handler to preload
python -c "
with open('$WORK_DIR/extract/out/preload/index.js', 'r') as f:
    p = f.read()
marker = '// Mission Control — Preload drag-and-drop handler'
idx = p.find(marker)
if idx >= 0:
    p = p[:idx].rstrip() + '\n'
with open('$WORK_DIR/extract/out/preload/index.js', 'w') as f:
    f.write(p)
"
echo "Adding drag-and-drop to preload..."
cat "$SCRIPT_DIR/src/preload-dragdrop.js" >> "$WORK_DIR/extract/out/preload/index.js"
echo "  Added preload drag-and-drop handler"

# --- Pack ---
echo "Packing app.asar..."
npx asar pack "$WORK_DIR/extract" "$ASAR_PATH"

# No codesign needed on Windows

echo "Cleaning up..."
rm -rf "$WORK_DIR"

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Launch Claude Desktop to see Mission Control."
echo ""
echo "Shortcuts: Ctrl+D (dashboard), Ctrl+T (new terminal)"
echo ""
echo "To customize, edit: $CONFIG_DIR/config.json"
echo "Data stored in:     $DATA_DIR/"
echo ""
echo "To uninstall: Restore the backup:"
echo "  cp '$APP_VERSION_DIR/resources/app.asar.pre-patch' '$ASAR_PATH'"
