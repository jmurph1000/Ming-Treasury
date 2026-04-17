// Mission Control — Main Process IPC Handlers
// This file is spliced into the Claude IDE main process (out/main/index.js)
// It reads config from ~/.config/claude-ide-mc/config.json
//
// Requires these variables in scope from the host app:
//   electron, sysPath, promises$1, child_process, util

const mcExecFileAsync = util.promisify(child_process.execFile);

// --- Config loader ---
const MC_CONFIG_FILE = sysPath.join(process.env.HOME || "", ".config", "claude-ide-mc", "config.json");
let _mcConfig = null;
let _mcConfigLastRead = 0;
function getMcConfig() {
  var now = Date.now();
  if (_mcConfig && (now - _mcConfigLastRead) < 60000) return _mcConfig;
  try {
    _mcConfig = JSON.parse(require("fs").readFileSync(MC_CONFIG_FILE, "utf-8"));
    _mcConfigLastRead = now;
  } catch {
    _mcConfig = _mcConfig || {};
  }
  return _mcConfig;
}

// --- Claude runner ---
function buildMcClaudeEnv() {
  const config = getMcConfig();
  const claudeEnv = config.claude?.env || {};
  return {
    ...process.env,
    PATH: "/opt/homebrew/bin:" + (process.env.HOME || "") + "/.local/bin:" + (process.env.PATH || ""),
    ...claudeEnv
  };
}

function getClaudePath() {
  const config = getMcConfig();
  return config.claude?.path || "/opt/homebrew/bin/claude";
}

function mcClaudeRun(args, timeout) {
  return new Promise((resolve, reject) => {
    // Spawn through login shell so MCP servers get full env (nvm, PATH, etc.)
    // Always use --bare to skip hooks/auto-memory/plugin sync that can hang
    // Use --dangerously-skip-permissions so MCP tools run without interactive approval
    const shell = process.env.SHELL || "/bin/zsh";
    const claudePath = getClaudePath();
    const bareArgs = ["--bare", "--dangerously-skip-permissions"].concat(args);
    const escapedArgs = bareArgs.map(a => "'" + a.replace(/'/g, "'\\''") + "'").join(" ");
    const shellCmd = claudePath + " " + escapedArgs;
    const proc = child_process.spawn(shell, ["-l", "-c", shellCmd], { cwd: sysPath.join(process.env.HOME || "/tmp", ".config", "claude-ide-mc"), env: buildMcClaudeEnv(), stdio: ["pipe", "pipe", "pipe"] });
    proc.stdin.end();
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => { proc.kill(); reject(new Error("timeout")); }, timeout || 90000);
    proc.on("close", (code) => { clearTimeout(timer); if (code === 0) resolve({ stdout, stderr }); else reject(Object.assign(new Error("exit " + code), { stdout, stderr, code })); });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// --- File paths ---
const mcDir = sysPath.join(process.env.HOME || "", ".memory", "mission-control");
const mcTodosFile = sysPath.join(mcDir, "todos.md");
const mcCalendarFile = sysPath.join(mcDir, "calendar-cache.json");
const mcNewsFile = sysPath.join(mcDir, "news-cache.json");
const mcTimeSavedFile = sysPath.join(mcDir, "time-saved.json");
const mcWaitingFile = sysPath.join(mcDir, "waiting-on.md");
const mcMarketFile = sysPath.join(mcDir, "market-cache.json");
const mcSlackPulseFile = sysPath.join(mcDir, "slack-pulse.json");

// --- Pty with resume (bypasses auto-claude to run claude --resume) ---
electron.ipcMain.handle("mc:createPtyResume", async (event, projectPath, sessionId) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error("No window found");
  const id = "pty-" + (nextId++);
  const shell = process.env.SHELL || "/bin/zsh";
  const ptyProcess = pty__namespace.spawn(shell, ["-l"], {
    name: "xterm-256color", cols: 120, rows: 30, cwd: projectPath,
    env: { ...process.env, TERM: "xterm-256color", PATH: (process.env.HOME || "") + "/.local/bin:" + (process.env.PATH || "") }
  });
  // Write resume command instead of bare "claude"
  setTimeout(function() { ptyProcess.write("claude --resume " + sessionId + "\r"); }, 500);
  ptyProcess.onData(function(data) { if (!win.isDestroyed()) win.webContents.send("pty:data", id, data); });
  ptyProcess.onExit(function() { sessions.delete(id); if (!win.isDestroyed()) win.webContents.send("pty:exit", id); });
  sessions.set(id, { process: ptyProcess, projectPath: projectPath });
  return id;
});

// --- Config IPC (provides config to renderer via preload) ---
electron.ipcMain.handle("mc:getConfig", async () => {
  return getMcConfig();
});

// --- Open external (file or URL in default browser) ---
electron.ipcMain.handle("mc:openExternal", async (_, url) => {
  let target = url;
  if (target.startsWith("~")) target = sysPath.join(process.env.HOME || "", target.slice(1));
  if (!target.startsWith("http") && !target.startsWith("file://")) target = "file://" + target;
  electron.shell.openExternal(target);
});

// --- Todos ---
electron.ipcMain.handle("mc:loadTodos", async () => {
  try { return await promises$1.readFile(mcTodosFile, "utf-8"); } catch { return ""; }
});
electron.ipcMain.handle("mc:saveTodos", async (_, content) => {
  await promises$1.mkdir(sysPath.dirname(mcTodosFile), { recursive: true });
  await promises$1.writeFile(mcTodosFile, content, "utf-8");
});
electron.ipcMain.handle("mc:watchTodos", async () => {
  try { return await promises$1.readFile(mcTodosFile, "utf-8"); } catch { return ""; }
});

// --- Calendar ---
electron.ipcMain.handle("mc:loadCalendar", async () => {
  try { return JSON.parse(await promises$1.readFile(mcCalendarFile, "utf-8")); } catch { return { today: [], tomorrow: [] }; }
});
// Calendar refresh: calls gcalgusto MCP via claude CLI with explicit --mcp-config.
// Org-managed MCP servers don't auto-connect in -p mode, but --mcp-config forces it.
const MC_GCAL_MCP_CONFIG = sysPath.join(process.env.HOME || "", ".config", "claude-ide-mc", "gcal-mcp.json");
let _calLastFail = 0;
let _calFailCount = 0;
electron.ipcMain.handle("mc:refreshCalendar", async (_, forceRefresh) => {
  const debugLog = async (msg) => { try { await promises$1.appendFile(sysPath.join(mcDir, "cal-debug.log"), new Date().toISOString() + " " + msg + "\n"); } catch {} };
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(await promises$1.readFile(mcCalendarFile, "utf-8"));
        if (cached.fetchedAt) {
          const age = Date.now() - new Date(cached.fetchedAt).getTime();
          if (age < 10 * 60 * 1000 && ((cached.today && cached.today.length > 0) || (cached.tomorrow && cached.tomorrow.length > 0))) return cached;
        }
      } catch {}
    }
    // Backoff: after consecutive failures, wait longer before retrying (max 30 min)
    if (!forceRefresh && _calFailCount > 0) {
      var backoffMs = Math.min(_calFailCount * 10 * 60 * 1000, 30 * 60 * 1000);
      if (Date.now() - _calLastFail < backoffMs) {
        try { return JSON.parse(await promises$1.readFile(mcCalendarFile, "utf-8")); } catch {}
        return null;
      }
    }
    await debugLog("refresh start, force=" + forceRefresh);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dayAfterStr = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const prompt = "Use mcp__gcalgusto__list_events to get events for time_min=" + todayStr + "T00:00:00 and time_max=" + dayAfterStr + "T00:00:00, max_results=30. Return ONLY this JSON, no markdown fences:\n{\"today\":[{\"title\":\"Name\",\"time\":\"9:00 AM\",\"attendees\":3,\"location\":\"\"}],\"tomorrow\":[...]}\nRules: Convert times to h:mm AM/PM Pacific. Count attendees as number. Skip all-day events named Home. Split by date: " + todayStr + "=today, " + tomorrowStr + "=tomorrow. Sort by time.";
    const { stdout, stderr } = await mcClaudeRun(["--mcp-config", MC_GCAL_MCP_CONFIG, "-p", prompt], 90000);
    await debugLog("claude returned, stdout len=" + stdout.length + ", stderr len=" + (stderr || "").length);
    let data = null;
    const jsonMatch = stdout.match(/\{[\s\S]*"today"[\s\S]*"tomorrow"[\s\S]*\}/);
    if (jsonMatch) {
      try { data = JSON.parse(jsonMatch[0]); } catch (pe) { await debugLog("JSON parse failed: " + pe.message); }
    } else {
      await debugLog("no JSON match in stdout: " + stdout.slice(0, 200));
    }
    if (data && (data.today || data.tomorrow)) {
      data.fetchedAt = new Date().toISOString();
      await promises$1.mkdir(sysPath.dirname(mcCalendarFile), { recursive: true });
      await promises$1.writeFile(mcCalendarFile, JSON.stringify(data, null, 2), "utf-8");
      _calFailCount = 0;
      await debugLog("success: " + (data.today || []).length + " today, " + (data.tomorrow || []).length + " tomorrow");
      return data;
    }
    await debugLog("no valid data, returning stale cache");
    try { return JSON.parse(await promises$1.readFile(mcCalendarFile, "utf-8")); } catch {}
    return null;
  } catch (err) {
    _calFailCount++;
    _calLastFail = Date.now();
    await debugLog("error (fail #" + _calFailCount + "): " + (err.message || err) + " stdout=" + ((err.stdout || "").slice(0, 200)) + " stderr=" + ((err.stderr || "").slice(0, 200)));
    try { return JSON.parse(await promises$1.readFile(mcCalendarFile, "utf-8")); } catch {}
    return null;
  }
});

// --- Slack draft & send ---
electron.ipcMain.handle("mc:draftSlack", async (_, rawText, recipientName) => {
  try {
    const config = getMcConfig();
    const userName = config.user?.name || "the user";
    const voice = config.slack?.draftVoice || "direct, concise, collaborative";
    const draftPrompt = "Draft a Slack message from " + userName + " to " + recipientName + ". The raw intent is: " + rawText + ". Write it in this voice: " + voice + ". Return ONLY the message text, no quotes, no explanation. Keep it short.";
    const { stdout } = await mcClaudeRun(["-p", draftPrompt], 30000);
    return stdout.trim();
  } catch { return rawText; }
});
electron.ipcMain.handle("mc:sendSlack", async (_, channelId, message) => {
  try {
    const config = getMcConfig();
    const sig = config.user?.slackSignature || "_Sent by Claude Code_ :claude:";
    const fullMsg = message + "\n\n" + sig;
    const sendPrompt = "Use the slack_send_message tool to send this message to channel " + channelId + ". Message: " + JSON.stringify(fullMsg) + ". Return only sent or error.";
    const { stdout } = await mcClaudeRun(["-p", sendPrompt], 30000);
    return { ok: true, result: stdout.trim() };
  } catch (err) { return { ok: false, error: err.message }; }
});

// --- Recent sessions (from Claude history) ---
electron.ipcMain.handle("mc:recentProjects", async () => {
  try {
    const home = process.env.HOME || "";
    const histFile = sysPath.join(home, ".claude", "history.jsonl");
    const raw = await promises$1.readFile(histFile, "utf-8");
    const lines = raw.trim().split("\n");
    const sessions = {};
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        const sid = d.sessionId; if (!sid) continue;
        const msg = (d.display || "").trim();
        const ts = d.timestamp || 0;
        const proj = d.project || "";
        if (!sessions[sid]) {
          sessions[sid] = { id: sid, title: msg, project: proj, start: ts, last: ts, msgs: 1 };
        } else {
          sessions[sid].last = Math.max(sessions[sid].last, ts);
          sessions[sid].msgs++;
          if (msg.length > sessions[sid].title.length && !msg.startsWith("/") && sessions[sid].title.length < 30) {
            sessions[sid].title = msg;
          }
        }
      } catch {}
    }
    const sorted = Object.values(sessions).sort((a, b) => b.last - a.last).slice(0, 50);
    const deduped = [];
    for (const s of sorted) {
      const dup = deduped.find(d => d.project === s.project && Math.abs(d.last - s.last) < 30 * 60 * 1000);
      if (dup) { if (s.msgs > dup.msgs) { Object.assign(dup, s); } continue; }
      deduped.push(s);
    }
    // Look up customTitle (session name) from session JSONL files
    const top = deduped.slice(0, 30);
    const projDir = sysPath.join(home, ".claude", "projects");
    try {
      const dirs = await promises$1.readdir(projDir);
      // Build lookup: scan each session's JSONL (read last 20KB for speed)
      const fs2 = require("fs");
      await Promise.all(top.map(async (s) => {
        for (const dir of dirs) {
          const jsonlPath = sysPath.join(projDir, dir, s.id + ".jsonl");
          try {
            const stat = await promises$1.stat(jsonlPath);
            const readSize = Math.min(stat.size, 20000);
            const buf = Buffer.alloc(readSize);
            const fh = await promises$1.open(jsonlPath, "r");
            await fh.read(buf, 0, readSize, Math.max(0, stat.size - readSize));
            await fh.close();
            const chunk = buf.toString("utf-8");
            const lines2 = chunk.split("\n");
            for (let i = lines2.length - 1; i >= 0; i--) {
              try {
                const entry = JSON.parse(lines2[i]);
                if (entry.customTitle) { s.customTitle = entry.customTitle; break; }
              } catch {}
            }
            if (s.customTitle) break;
          } catch {}
        }
      }));
    } catch {}
    return top.map(s => ({
      projectPath: s.project,
      name: s.customTitle || (s.title || "").slice(0, 60) || s.project.split("/").pop() || "Session",
      lastOpened: s.last,
      sessionId: s.id,
      msgCount: s.msgs
    }));
  } catch { return []; }
});

// --- News (Claude Code releases) ---
electron.ipcMain.handle("mc:loadNews", async () => {
  try { return JSON.parse(await promises$1.readFile(mcNewsFile, "utf-8")); } catch { return null; }
});
electron.ipcMain.handle("mc:refreshNews", async (_, forceRefresh) => {
  try {
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(await promises$1.readFile(mcNewsFile, "utf-8"));
        if (cached.fetchedAt) {
          const age = Date.now() - new Date(cached.fetchedAt).getTime();
          if (age < 24 * 60 * 60 * 1000 && cached.items && cached.items.length > 0) return cached;
        }
      } catch {}
    }
    const ghPath = "/opt/homebrew/bin/gh";
    const { stdout } = await mcExecFileAsync(ghPath, ["api", "repos/anthropics/claude-code/releases", "--jq", ".[0:10] | .[] | {tag_name, published_at, body}"], { timeout: 15000, maxBuffer: 1024 * 1024, env: { ...process.env, PATH: "/opt/homebrew/bin:" + process.env.PATH } });
    const releases = stdout.trim().split("\n").filter(l => l.startsWith("{")).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const nowMs = Date.now();
    const skipWords = ["fixed", "removed deprecated", "bumped", "updated dependency", "internal cleanup", "improved error", "minor"];
    const boostWords = ["/loop", "/config", "background task", "mcp", "hook", "model", "token", "memory", "parallel", "agent", "skill", "worktree", "elicitation"];
    const allBullets = [];
    for (const r of releases) {
      const daysAgo = Math.round((nowMs - new Date(r.published_at).getTime()) / 86400000);
      const body = (r.body || "").replace(/^## What's changed\s*/i, "").trim();
      const bullets = body.split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "").replace(/`/g, "").trim());
      let countFromRelease = 0;
      for (const b of bullets) {
        if (countFromRelease >= 2) break;
        const lower = b.toLowerCase();
        if (skipWords.some(sw => lower.startsWith(sw))) continue;
        if (lower.length < 20) continue;
        const boost = boostWords.some(bw => lower.includes(bw)) ? 1 : 0;
        allBullets.push({ text: b.replace(/^Added\s+/i, ""), daysAgo, url: "https://github.com/anthropics/claude-code/releases/tag/" + r.tag_name, boost });
        countFromRelease++;
      }
    }
    allBullets.sort((a, b) => (b.boost - a.boost) || (a.daysAgo - b.daysAgo));
    const items = allBullets.slice(0, 5).map(b => ({ title: b.text, url: b.url, daysAgo: b.daysAgo }));
    if (items.length === 0) return null;
    const result = { items, fetchedAt: new Date().toISOString() };
    await promises$1.writeFile(mcNewsFile, JSON.stringify(result, null, 2));
    return result;
  } catch { return null; }
});

// --- Time saved tracking ---
electron.ipcMain.handle("mc:logTimeSaved", async (_, action, minutesSaved) => {
  try {
    let data = {};
    try { data = JSON.parse(await promises$1.readFile(mcTimeSavedFile, "utf-8")); } catch {}
    const today = new Date().toISOString().slice(0, 10);
    if (!data[today]) data[today] = { total: 0, actions: [] };
    data[today].total += minutesSaved;
    data[today].actions.push({ action, minutes: minutesSaved, at: new Date().toISOString() });
    const keys = Object.keys(data).sort().reverse();
    if (keys.length > 30) { for (const k of keys.slice(30)) delete data[k]; }
    await promises$1.writeFile(mcTimeSavedFile, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
});
electron.ipcMain.handle("mc:getTimeSaved", async () => {
  try {
    const data = JSON.parse(await promises$1.readFile(mcTimeSavedFile, "utf-8"));
    const today = new Date().toISOString().slice(0, 10);
    const todayData = data[today] || { total: 0, actions: [] };
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    let weekTotal = 0;
    for (const [dateKey, dayData] of Object.entries(data)) {
      if (dateKey >= weekStartStr) weekTotal += (dayData.total || 0);
    }
    return { today: todayData.total, week: weekTotal, actions: todayData.actions || [] };
  } catch { return { today: 0, week: 0, actions: [] }; }
});

// --- Daily cost tracker (persists across app restarts) ---
const mcCostFile = sysPath.join(mcDir, "cost-tracker.json");
electron.ipcMain.handle("mc:loadCosts", async () => {
  try {
    const data = JSON.parse(await promises$1.readFile(mcCostFile, "utf-8"));
    const today = new Date().toISOString().slice(0, 10);
    return data[today] || {};
  } catch { return {}; }
});
electron.ipcMain.handle("mc:saveCosts", async (_, tabCosts) => {
  try {
    let data = {};
    try { data = JSON.parse(await promises$1.readFile(mcCostFile, "utf-8")); } catch {}
    const today = new Date().toISOString().slice(0, 10);
    data[today] = tabCosts;
    // Keep last 30 days
    const keys = Object.keys(data).sort().reverse();
    if (keys.length > 30) { for (const k of keys.slice(30)) delete data[k]; }
    await promises$1.mkdir(sysPath.dirname(mcCostFile), { recursive: true });
    await promises$1.writeFile(mcCostFile, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
});

// --- Waiting on ---
electron.ipcMain.handle("mc:loadWaiting", async () => {
  try { return await promises$1.readFile(mcWaitingFile, "utf-8"); } catch { return ""; }
});
electron.ipcMain.handle("mc:saveWaiting", async (_, content) => {
  try { await promises$1.writeFile(mcWaitingFile, content); return true; } catch { return false; }
});

// --- Meeting context (Notion) ---
electron.ipcMain.handle("mc:meetingContext", async (_, meetingTitle) => {
  try {
    const prompt = "Use notion-query-meeting-notes to find the most recent meeting notes for a meeting titled or related to: " + JSON.stringify(meetingTitle) + ". Return ONLY valid JSON with keys: summary (2-3 sentences of what was discussed), actionItems (array of strings - open action items), attendees (array of name strings). If no notes found, return {\"summary\":\"No prior notes found\",\"actionItems\":[],\"attendees\":[]}.";
    const { stdout } = await mcClaudeRun(["-p", prompt], 60000);
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    return { summary: stdout.trim().substring(0, 300), actionItems: [], attendees: [] };
  } catch { return { summary: "Could not fetch context", actionItems: [], attendees: [] }; }
});

// --- Market data (Yahoo Finance v8 chart API) ---
electron.ipcMain.handle("mc:marketData", async (_, forceRefresh) => {
  try {
    const config = getMcConfig();
    if (config.markets?.enabled === false) return { quotes: [], fetchedAt: null };
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(await promises$1.readFile(mcMarketFile, "utf-8"));
        if (cached.fetchedAt) {
          const age = Date.now() - new Date(cached.fetchedAt).getTime();
          if (age < 5 * 60 * 1000 && cached.quotes && cached.quotes.length > 0) return cached;
        }
      } catch {}
    }
    const https = require("https");
    const tickers = config.markets?.tickers || [
      { symbol: "^DJI", name: "Dow Jones" },
      { symbol: "^GSPC", name: "S&P 500" },
      { symbol: "^IXIC", name: "Nasdaq" },
      { symbol: "IGV", name: "Software (IGV)" }
    ];
    function fetchChart(sym) {
      return new Promise((resolve) => {
        const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?interval=1d&range=2d";
        const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
          let body = "";
          res.on("data", (c) => { body += c; });
          res.on("end", () => {
            try {
              const d = JSON.parse(body);
              const meta = d.chart.result[0].meta;
              const price = meta.regularMarketPrice;
              const prev = meta.chartPreviousClose || meta.previousClose || price;
              const change = price - prev;
              const changePct = prev > 0 ? (change / prev) * 100 : 0;
              resolve({ price, change, changePct });
            } catch { resolve(null); }
          });
        });
        req.on("error", () => resolve(null));
        setTimeout(() => { req.destroy(); resolve(null); }, 10000);
      });
    }
    const results = await Promise.all(tickers.map(t => fetchChart(t.symbol)));
    const quotes = tickers.map((t, i) => results[i] ? { symbol: t.symbol, name: t.name, price: results[i].price, change: results[i].change, changePct: results[i].changePct } : null).filter(Boolean);
    const result = { quotes, fetchedAt: new Date().toISOString() };
    if (quotes.length > 0) await promises$1.writeFile(mcMarketFile, JSON.stringify(result, null, 2));
    return result;
  } catch { return { quotes: [], fetchedAt: null }; }
});

// --- Slack pulse ---
// --- MCP Status ---
electron.ipcMain.handle("mc:mcpStatus", async () => {
  try {
    const claudePath = "/opt/homebrew/bin/claude";
    const env = { ...process.env, PATH: "/opt/homebrew/bin:" + (process.env.PATH || "") };
    const { stdout } = await mcExecFileAsync(claudePath, ["mcp", "list"], { timeout: 30000, maxBuffer: 1024 * 1024, env });
    const lines = stdout.split("\n").filter(l => l.includes(" - "));
    const servers = lines.map(line => {
      const nameMatch = line.match(/^(\S+):/);
      const name = nameMatch ? nameMatch[1] : line.split(":")[0].trim();
      const connected = line.includes("Connected");
      const needsAuth = line.includes("Needs authentication");
      const error = line.includes("Error") || line.includes("error");
      const status = connected ? "connected" : needsAuth ? "needs_auth" : error ? "error" : "unknown";
      return { name, status };
    });
    const connected = servers.filter(s => s.status === "connected").length;
    const needsAuth = servers.filter(s => s.status === "needs_auth").length;
    const errored = servers.filter(s => s.status === "error").length;
    return { servers, connected, needsAuth, errored, total: servers.length, fetchedAt: new Date().toISOString() };
  } catch { return { servers: [], connected: 0, needsAuth: 0, errored: 0, total: 0, fetchedAt: null }; }
});

// --- Desktop notifications ---
electron.ipcMain.handle("mc:notify", async (_, title, body) => {
  try {
    if (electron.Notification.isSupported()) {
      const n = new electron.Notification({ title: title || "Mission Control", body: body || "", silent: false });
      n.show();
      return true;
    }
    return false;
  } catch { return false; }
});

electron.ipcMain.handle("mc:slackPulse", async (_, forceRefresh) => {
  try {
    const config = getMcConfig();
    const channels = config.slack?.pulseChannels || [];
    if (channels.length === 0) return { channels: [], fetchedAt: null };
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(await promises$1.readFile(mcSlackPulseFile, "utf-8"));
        if (cached.fetchedAt) {
          const age = Date.now() - new Date(cached.fetchedAt).getTime();
          if (age < 10 * 60 * 1000 && cached.channels) return cached;
        }
      } catch {}
    }
    const channelList = channels.map(c => c.id + " (" + c.name + ")").join(", ");
    const prompt = "Use slack_read_channel to read the 3 most recent messages from each of these channels: " + channelList + ". Count how many were posted today. Return ONLY valid JSON array: [{\"channel\":\"#channel-name\",\"todayCount\":0,\"hasMention\":false,\"latestMessage\":\"first 60 chars of newest msg\"}]";
    const { stdout } = await mcClaudeRun(["-p", prompt], 90000);
    let result_channels = [];
    try {
      const jsonMatch = stdout.match(/\[[\s\S]*\]/);
      if (jsonMatch) result_channels = JSON.parse(jsonMatch[0]);
    } catch {}
    const result = { channels: result_channels, fetchedAt: new Date().toISOString() };
    if (result_channels.length > 0) await promises$1.writeFile(mcSlackPulseFile, JSON.stringify(result, null, 2));
    return result;
  } catch { return { channels: [], fetchedAt: null }; }
});
