#!/bin/bash
set -e

# Mission Control Installer for Claude IDE
# Patches the Claude IDE Electron app with the Mission Control dashboard

APP_PATH="/Applications/Claude IDE.app"
ASAR_PATH="$APP_PATH/Contents/Resources/app.asar"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$HOME/.config/claude-ide-mc"
DATA_DIR="$HOME/.memory/mission-control"
WORK_DIR="/tmp/claude-ide-mc-install"

echo "=== Mission Control Installer ==="
echo ""

# --- Preflight checks ---
if [ ! -d "$APP_PATH" ]; then
  echo "ERROR: Claude IDE not found at $APP_PATH"
  echo "Install Claude IDE first, then run this script."
  exit 1
fi

# Ensure we're using asar (not extracted directory) — extracted dirs break pty spawning
if [ -d "$APP_PATH/Contents/Resources/app" ] && [ ! -f "$ASAR_PATH" ]; then
  echo "ERROR: App is running from extracted directory (breaks process spawning)."
  echo "Restore app.asar from a backup first:"
  ls "$APP_PATH/Contents/Resources/app.asar"* 2>/dev/null
  exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "ERROR: npx not found. Install Node.js first."
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "WARNING: claude CLI not found in PATH. Some features (calendar, Slack, meeting context) require it."
fi

# --- Kill the app if running ---
if pgrep -f "Claude IDE" >/dev/null 2>&1; then
  echo "Stopping Claude IDE..."
  pkill -f "Claude IDE" 2>/dev/null || true
  sleep 2
fi

# --- Setup config ---
mkdir -p "$CONFIG_DIR"
mkdir -p "$DATA_DIR"

if [ ! -f "$CONFIG_DIR/config.json" ]; then
  echo "Creating config from template..."
  cp "$SCRIPT_DIR/config.example.json" "$CONFIG_DIR/config.json"
  echo ""
  echo "IMPORTANT: Edit your config at:"
  echo "  $CONFIG_DIR/config.json"
  echo ""
  echo "You should customize:"
  echo "  - user.name (your name for Slack drafts)"
  echo "  - claude.env (your auth environment variables)"
  echo "  - slack.pulseChannels (channels to monitor)"
  echo "  - slack.quickRecipients (people/channels for quick messaging)"
  echo "  - skills.categories (your Claude Code skills)"
  echo ""
else
  echo "Config already exists at $CONFIG_DIR/config.json"
fi

# Assemble standalone dashboard HTML from parts
echo "Building dashboard HTML..."
python3 -c "
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
# Use clean pre-patch backup if available (avoids stacking patches on re-install)
CLEAN_ASAR="$ASAR_PATH"
if [ -f "$APP_PATH/Contents/Resources/app.asar.pre-patch" ]; then
  CLEAN_ASAR="$APP_PATH/Contents/Resources/app.asar.pre-patch"
  echo "Using clean backup: app.asar.pre-patch"
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

# Strip ALL old MC injections using python (handles multiple stacked patches)
python3 -c "
import re

# --- Main process: remove all MC handler blocks ---
with open('$MAIN_JS', 'r') as f:
    main = f.read()
# Remove all blocks between MC markers (optionally eat trailing } from older installs)
pattern = r'\n*// --- Mission Control Handlers \(injected\) ---.*?// --- End Mission Control Handlers ---(?:\n\})?'
count = len(re.findall(pattern, main, re.DOTALL))
main = re.sub(pattern, '', main, flags=re.DOTALL)
if count:
    print(f'  Stripped {count} old main process MC patch(es)')
# Also strip any mc: handlers embedded inside registerIpcHandlers (from pre-marker installs)
# Match: electron.ipcMain.handle("mc:...", async (...) => { ... });
mc_count = len(re.findall(r'electron\.ipcMain\.handle\(\"mc:', main))
if mc_count:
    main = re.sub(r'\n  electron\.ipcMain\.handle\(\"mc:[^\"]+\".*?\n  \}\);', '', main, flags=re.DOTALL)
    print(f'  Stripped {mc_count} embedded mc: handlers')
# Fix registerIpcHandlers close: older installs corrupted } to }); via NEEDS_CLOSE bug
# The last ipcMain.handle closes with });, then registerIpcHandlers should close with }
main = main.replace('    return id;\n  });\n  });\n', '    return id;\n  });\n}\n')
with open('$MAIN_JS', 'w') as f:
    f.write(main)

# --- Preload: remove all MC API lines and comment blocks ---
with open('$PRELOAD_JS', 'r') as f:
    preload = f.read()
# Remove MC comment blocks
preload = re.sub(r'\n*// Mission Control.*?Preload API[^\n]*\n// [^\n]*\n\n?', '\n', preload, flags=re.DOTALL)
# Remove all mc* API lines (mcGetConfig, mcLoadTodos, etc.) and getHomePath
lines = preload.split('\n')
stripped = [l for l in lines if not re.match(r'^\s+(mc[A-Z]\w+|getHomePath)\s*:', l)]
removed = len(lines) - len(stripped)
preload = '\n'.join(stripped)
# Fix trailing comma issues: if a line ends with no comma before };
preload = re.sub(r'(\w[^\n]*[^,\s])\n(\s*\}\s*;)', r'\1\n\2', preload)
if removed:
    print(f'  Stripped {removed} old preload mc/getHomePath lines')
with open('$PRELOAD_JS', 'w') as f:
    f.write(preload)

# --- Renderer: remove MC dashboard (parseTodos..StatusBar) and Cmd+D shortcut ---
with open('$RENDERER_JS', 'r') as f:
    renderer = f.read()
# Strip old Cmd+D keyboard shortcut injection(s)
renderer = re.sub(r'[^\n]*_mcKbd[^\n]*\n', '', renderer)
# Find parseTodos and StatusBar positions
pt = renderer.find('function parseTodos')
sb = renderer.find('function StatusBar')
if pt >= 0 and sb > pt:
    # Find the start of the line containing parseTodos
    line_start = renderer.rfind('\n', 0, pt) + 1
    renderer = renderer[:line_start] + renderer[sb:]
    print('  Stripped old renderer MC patch')
with open('$RENDERER_JS', 'w') as f:
    f.write(renderer)
" 2>&1

echo "Patching main process..."

# Find the injection point: end of registerIpcHandlers function, before createWindow
# We inject just before the closing brace of registerIpcHandlers
INJECT_MARKER="function createWindow()"
INJECT_LINE=$(grep -n "$INJECT_MARKER" "$MAIN_JS" | head -1 | cut -d: -f1)

if [ -z "$INJECT_LINE" ]; then
  echo "ERROR: Could not find injection point in main process."
  exit 1
fi

# Insert MC handlers at module scope, between registerIpcHandlers close and createWindow.
# ipcMain.handle works at module scope — no need to be inside registerIpcHandlers.
{
  head -$((INJECT_LINE - 1)) "$MAIN_JS"
  echo ""
  echo "// --- Mission Control Handlers (injected) ---"
  cat "$SCRIPT_DIR/src/main-handlers.js"
  echo ""
  echo "// --- End Mission Control Handlers ---"
  tail -n "+$INJECT_LINE" "$MAIN_JS"
} > "$MAIN_JS.tmp"
mv "$MAIN_JS.tmp" "$MAIN_JS"

echo "Patching preload..."
PRELOAD_JS="$WORK_DIR/extract/out/preload/index.js"

# Insert preload APIs before the closing }; of the api object
sed -i '' '/^};$/i\
'"$(sed 's/$/\\/' "$SCRIPT_DIR/src/preload-apis.js" | sed '$ s/\\$//')" "$PRELOAD_JS" 2>/dev/null || {
  # Fallback: use python for more reliable injection
  python3 -c "
import re
with open('$PRELOAD_JS', 'r') as f:
    content = f.read()
with open('$SCRIPT_DIR/src/preload-apis.js', 'r') as f:
    apis = f.read()
# Find the last }; before contextBridge line
content = content.replace('};\\nelectron.contextBridge', apis + '};\\nelectron.contextBridge')
with open('$PRELOAD_JS', 'w') as f:
    f.write(content)
"
}

echo "Patching dashboard..."
RENDERER_JS=$(ls "$WORK_DIR/extract/out/renderer/assets/"index-*.js 2>/dev/null | head -1)

if [ -z "$RENDERER_JS" ]; then
  echo "ERROR: Could not find renderer JS."
  exit 1
fi

# Find splice points
# After stripping old MC patches, parseTodos may be gone — use StatusBar as sole anchor
START_LINE=$(grep -n "function parseTodos" "$RENDERER_JS" | head -1 | cut -d: -f1)
END_LINE=$(grep -n "function StatusBar" "$RENDERER_JS" | head -1 | cut -d: -f1)

if [ -z "$END_LINE" ]; then
  echo "ERROR: Could not find StatusBar in renderer."
  echo "This may mean the Claude IDE version changed. Check the renderer JS manually."
  exit 1
fi

# If parseTodos exists (fresh app), splice between parseTodos and StatusBar
# If parseTodos was stripped (re-install), inject right before StatusBar
SPLICE_BEFORE=${START_LINE:-$END_LINE}

{
  head -$((SPLICE_BEFORE - 1)) "$RENDERER_JS"
  cat "$SCRIPT_DIR/src/dashboard-bridge.js"
  echo ""
  tail -n "+$END_LINE" "$RENDERER_JS"
} > "$RENDERER_JS.tmp"
mv "$RENDERER_JS.tmp" "$RENDERER_JS"

echo "Applying renderer tweaks (hide explorer, default project path)..."
python3 -c "
with open('$RENDERER_JS', 'r') as f:
    r = f.read()

# 1. Hide file explorer sidebar by default
r = r.replace('sidebarOpen: true,', 'sidebarOpen: false,')

# 1b. Prevent FileExplorer from scanning files when sidebar is closed
# Change useFileTree to bail out when sidebar is closed
r = r.replace(
    'function useFileTree(projectPath) {',
    'function useFileTree(projectPath, sidebarOpen) {\n  if (!sidebarOpen) return { tree: [], gitStatuses: {} };'
)
# Pass sidebarOpen to the hook
r = r.replace(
    'const { tree, gitStatuses } = useFileTree(state.projectPath);',
    'const { tree, gitStatuses } = useFileTree(state.projectPath, state.sidebarOpen);'
)

# 2. Auto-set project path to home dir, skip watchProject (avoids macOS Photos/Music prompts)
# Handle both fresh app (selectDirectory) and re-install (getHomePath)
# Replace ALL occurrences — skip watchProject everywhere to prevent TCC prompts on ~
target = '''dispatch({ type: \"SET_PROJECT_PATH\", path: dir });
          await window.api.watchProject(dir);
          await window.api.addRecentSession(dir);
          const branch = await window.api.getGitBranch(dir);
          dispatch({ type: \"SET_GIT_BRANCH\", branch });'''
replacement = '''dispatch({ type: \"SET_PROJECT_PATH\", path: dir });
          await window.api.addRecentSession(dir);'''
r = r.replace(target, replacement)

# Also strip any remaining watchProject calls (different indentation in TabBar)
import re as _re_wp
r = _re_wp.sub(r'\n\s*await window\.api\.watchProject\(dir\);', '', r)

# Replace selectDirectory with getHomePath in App init
r = r.replace(
    'const dir = await window.api.selectDirectory();\\n        if (dir) {',
    \"const dir = await window.api.getHomePath() || '$HOME';\\n        if (dir) {\"
)

# Ensure projectPath is always set (not just on first launch)
# The init returns early when sessions exist, leaving projectPath null
# This causes TabBar to show selectDirectory dialog on new tab
import os as _os
_home = _os.environ.get('HOME', '/tmp')
r = r.replace(
    'if (sessions.length > 0) return;',
    \"if (sessions.length > 0) { dispatch({ type: 'SET_PROJECT_PATH', path: await window.api.getHomePath() || '\" + _home + \"' }); return; }\"
)

# 3. Fix terminal layout and fit
# ROOT CAUSE: TerminalTab div has width/height: 100% but no flex:1 in a flex column.
# When the Dashboard (which has flex:1) hides, the terminal container collapses and
# xterm's FitAddon measures a tiny width, giving ~10 columns.
# FIX: Add flex:1 to TerminalTab so it fills the flex column properly.

import re as _re_fit

# 3-pre. Fix TerminalTab container style: add flex:1, remove height:100%
# Match the TerminalTab return style (unique: visible ? "block" : "none" + background: "#1e1e1e")
_term_style_old = 'width: \"100%\",\n        height: \"100%\",\n        display: visible ? \"block\" : \"none\",\n        background: \"#1e1e1e\"'
_term_style_new = 'flex: visible ? 1 : \"none\",\n        width: \"100%\",\n        minHeight: 0,\n        overflow: \"hidden\",\n        display: visible ? \"flex\" : \"none\",\n        background: \"#1e1e1e\"'
if _term_style_old in r:
    r = r.replace(_term_style_old, _term_style_new)
    print('  Patched TerminalTab container: flex:1, overflow:hidden (fixes narrow terminal)')
else:
    # Already patched or different format — try the patched version
    if 'flex: visible ? 1 : \"none\"' in r:
        print('  TerminalTab container already patched')
    else:
        print('  WARN: Could not find TerminalTab style to patch')

# 3a. Replace immediate fit with delayed fits (handles both fresh and re-install)
# Strip any existing delayed fits first, then add fresh ones
# Remove old delayed fit lines
r = _re_fit.sub(r'\n\s*setTimeout\(\(\) => \{ try \{ fitAddon\.fit\(\).*?\}, \d+\);', '', r)
# Add delayed fits after fitAddonRef assignment
_fit_target = 'terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
if _fit_target not in r:
    _fit_target = 'terminal.open(containerRef.current);\n    fitAddon.fit();\n    terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
    if _fit_target in r:
        r = r.replace(_fit_target, 'terminal.open(containerRef.current);\n    terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;')
_fit_insert = 'terminalRef.current = terminal;\n    fitAddonRef.current = fitAddon;'
if _fit_insert in r:
    r = r.replace(_fit_insert, _fit_insert + '\n    var _fitDone = false;\n    function _doFit() { try { var el = containerRef.current; if (!el || el.offsetWidth < 100) return; fitAddon.fit(); _fitDone = true; } catch(e) {} }\n    setTimeout(_doFit, 50);\n    setTimeout(_doFit, 200);\n    setTimeout(_doFit, 500);\n    setTimeout(_doFit, 1000);\n    setTimeout(_doFit, 2500);')
    print('  Patched initial fit (delayed, 5 stages)')

# 3a2. Add first-data fit (most reliable signal that container is laid out and pty is alive)
_data_target = 'if (id2 === ptyId) {\n        terminal.write(data);\n      }'
_data_replace = 'if (id2 === ptyId) {\n        terminal.write(data);\n        if (!_fitDone) { _fitDone = true; setTimeout(_doFit, 0); setTimeout(_doFit, 100); }\n      }'
if _data_target in r:
    r = r.replace(_data_target, _data_replace)
    print('  Patched first-data fit')

# 3b. Remove immediate resizePty (onResize handler fires when delayed fit runs)
if 'window.api.resizePty(ptyId, terminal.cols, terminal.rows);\n    const resizeObserver' in r:
    r = r.replace(
        'window.api.resizePty(ptyId, terminal.cols, terminal.rows);\n    const resizeObserver',
        'const resizeObserver'
    )
    print('  Removed immediate resizePty')

# 3c. Add scrollToBottom to ResizeObserver (skip if already patched)
if 'ResizeObserver(() => {\n      fitAddon.fit();\n    })' in r:
    r = r.replace(
        'const resizeObserver = new ResizeObserver(() => {\n      fitAddon.fit();\n    });',
        'const resizeObserver = new ResizeObserver(() => {\n      try { var el = containerRef.current; if (el && el.offsetWidth > 100) { fitAddon.fit(); terminal.scrollToBottom(); } } catch(e) {}\n    });'
    )
    print('  Patched ResizeObserver')

# 3d. Fix visibility effect — strip old patched version and replace
# Remove old visibility setTimeout lines
r = _re_fit.sub(r'\n\s*setTimeout\(\(\) => \{ fitAddonRef\.current\?\.fit\(\).*?\}, \d+\);', '', r)
# Also remove the un-patched version
r = r.replace('setTimeout(() => fitAddonRef.current?.fit(), 0);\n    ', '')
# Find the visibility check and replace it
_vis_old = 'if (visible && fitAddonRef.current) {\n    }'
_vis_old2 = 'if (visible && fitAddonRef.current) {\n      \n    }'
_vis_new = 'if (visible && fitAddonRef.current) {\n      function _vfit() { try { var el = containerRef.current; if (el && el.offsetWidth > 100) { fitAddonRef.current?.fit(); if (terminalRef.current) terminalRef.current.scrollToBottom(); } } catch(e) {} }\n      setTimeout(_vfit, 50);\n      setTimeout(_vfit, 200);\n      setTimeout(_vfit, 500);\n      setTimeout(_vfit, 1000);\n    }'
if _vis_old in r:
    r = r.replace(_vis_old, _vis_new)
    print('  Patched visibility effect (4 stages)')
elif _vis_old2 in r:
    r = r.replace(_vis_old2, _vis_new)
    print('  Patched visibility effect (4 stages)')

# 4. Clean up old drag-and-drop patches (now handled in dashboard.js at document level)
_ddi = r.find('onDragOver: function(e)')
if _ddi >= 0:
    _dde = r.find('},\n      style', _ddi)
    if _dde >= 0:
        _ddls = r.rfind('\n', 0, _ddi) + 1
        r = r[:_ddls] + r[_dde+2:]
        print('  Stripped old JSX drag-and-drop')
if 'addEventListener(\"drop\"' in r:
    import re as _ddr
    r = _ddr.sub(r'\n\s*containerRef\.current\.addEventListener\(\"dragover\".*?true\);', '', r, flags=_ddr.DOTALL)
    r = _ddr.sub(r'\n\s*containerRef\.current\.addEventListener\(\"drop\".*?true\);', '', r, flags=_ddr.DOTALL)
    print('  Stripped old DOM drag-and-drop')

# 5. Cmd+D to toggle dashboard tab (inject into App component)
_kbd_hook = '  reactExports.useEffect(function() { function _mcKbd(e) { if (e.metaKey || e.ctrlKey) { if (e.key === \\\"d\\\") { e.preventDefault(); dispatch({ type: \\\"SET_ACTIVE_TAB\\\", tabId: \\\"dashboard\\\" }); } if (e.key === \\\"t\\\") { e.preventDefault(); var pp = state.projectPath || \\\"/tmp\\\"; var tid = \\\"terminal-\\\" + Date.now(); var lbl = pp.split(\\\"/\\\").pop() || \\\"Terminal\\\"; window.api.createPty(pp).then(function(ptyId) { dispatch({ type: \\\"ADD_TAB\\\", tab: { id: tid, type: \\\"terminal\\\", label: lbl, closeable: true, ptyId: ptyId, projectPath: pp } }); }); } } } document.addEventListener(\\\"keydown\\\", _mcKbd); return function() { document.removeEventListener(\\\"keydown\\\", _mcKbd); }; }, [dispatch, state.projectPath]);\\n'
# Inject after useClaudeStatus() in App()
_target = 'useClaudeStatus();\\n'
_ti = r.find(_target)
if _ti >= 0:
    _insert_at = _ti + len(_target)
    r = r[:_insert_at] + _kbd_hook + r[_insert_at:]
    print('  Patched Cmd+D shortcut')

with open('$RENDERER_JS', 'w') as f:
    f.write(r)
print('  Applied renderer tweaks')
"

# Patch main process: skip TCC-protected dirs in fs:readDir to prevent Photos/Music prompts
echo "Patching main process (TCC skip)..."
python3 -c "
with open('$MAIN_JS', 'r') as f:
    m = f.read()
# The fs:readDir handler stats every entry in the listed dir.
# When projectPath is ~, stat on ~/Photos, ~/Music etc triggers macOS TCC prompts.
# Add a skip list for known TCC-protected directory names.
# First strip any old TCC patches (const _tccSkip or inlined version)
import re
with open('$MAIN_JS', 'r') as f:
    m = f.read()
# Remove old const _tccSkip lines
m = re.sub(r'\n\s*const _tccSkip = \[.*?\];\n\s*if \(entry\.isDirectory\(\) && _tccSkip\.includes\(entry\.name\)\) continue;', '', m)
# Remove old inlined version
m = m.replace(' || (entry.isDirectory() && [\"Photos\",\"Music\",\"Movies\",\"Pictures\",\"Library\",\"Mail\",\"Contacts\"].includes(entry.name))', '')
with open('$MAIN_JS', 'w') as f:
    f.write(m)
old = 'if (entry.name.startsWith(\".\") || entry.name === \"node_modules\") continue;'
new = 'if (entry.name.startsWith(\".\") || entry.name === \"node_modules\" || (entry.isDirectory() && [\"Photos\",\"Music\",\"Movies\",\"Pictures\",\"Library\",\"Mail\",\"Contacts\"].includes(entry.name))) continue;'
if old in m:
    m = m.replace(old, new)
    print('  Patched fs:readDir to skip TCC dirs')
else:
    print('  WARN: fs:readDir skip pattern not found (may already be patched)')
with open('$MAIN_JS', 'w') as f:
    f.write(m)
"

# getHomePath is now included in preload-apis.js, no separate injection needed

# Append drag-and-drop handler to preload (needs electron.webUtils for file paths)
# Strip old drag-drop handler from preload, then re-add current version
python3 -c "
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

# --- Pack, install, and re-sign ---
echo "Packing app.asar..."
npx asar pack "$WORK_DIR/extract" "$ASAR_PATH"

echo "Re-signing app (required for pty/process spawning on macOS)..."
codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || echo "WARNING: codesign failed. App may not be able to spawn terminals."

echo "Cleaning up..."
rm -rf "$WORK_DIR"

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Launch Claude IDE to see Mission Control."
echo ""
echo "To customize, edit: $CONFIG_DIR/config.json"
echo "Data stored in:     $DATA_DIR/"
echo ""
echo "To uninstall: Delete the app and reinstall Claude IDE from scratch."
echo "              Also remove $CONFIG_DIR/ and $DATA_DIR/ if desired."

# Offer to launch
read -p "Launch Claude IDE now? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  open -a "Claude IDE"
fi
