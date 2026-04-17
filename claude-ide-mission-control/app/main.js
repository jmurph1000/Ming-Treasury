// Command Center — Standalone Electron Main Process
// Ported from src/main-handlers.js for Windows compatibility

const { app, BrowserWindow, ipcMain, shell, Notification, session, net } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const fsp = fs.promises;
const http = require("http");
const { spawn, execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

// Local HTTP server so Web Speech API works (requires non-file:// origin)
let localServerPort = 0;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
function startLocalServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const safePath = path.normalize(req.url.split("?")[0]).replace(/^\/+/, "");
      const filePath = path.join(__dirname, safePath || "index.html");
      if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    srv.listen(0, "127.0.0.1", () => { localServerPort = srv.address().port; resolve(); });
  });
}

const HOME = os.homedir();

// --- PTY sessions ---
let pty;
try { pty = require("node-pty"); } catch { pty = null; }
const sessions = new Map();
let nextPtyId = 1;

// --- Config ---
const CONFIG_DIR = path.join(HOME, ".config", "claude-ide-mc");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
let _mcConfig = null;
let _mcConfigLastRead = 0;

function getMcConfig() {
  const now = Date.now();
  if (_mcConfig && (now - _mcConfigLastRead) < 60000) return _mcConfig;
  try {
    _mcConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    _mcConfigLastRead = now;
  } catch {
    _mcConfig = _mcConfig || {};
  }
  return _mcConfig;
}

function ensureConfig() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = path.join(__dirname, "config.default.json");
    if (fs.existsSync(defaultConfig)) {
      fs.copyFileSync(defaultConfig, CONFIG_FILE);
    } else {
      fs.writeFileSync(CONFIG_FILE, "{}", "utf-8");
    }
  }
}

// --- Claude runner (Windows-compatible) ---
function getClaudePath() {
  const config = getMcConfig();
  if (config.claude?.path) return config.claude.path;
  // Auto-detect
  const localBin = path.join(HOME, ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude");
  if (fs.existsSync(localBin)) return localBin;
  return "claude"; // fall back to PATH
}

function buildClaudeEnv() {
  const config = getMcConfig();
  const claudeEnv = config.claude?.env || {};
  const envPath = process.env.PATH || "";
  const localBinDir = path.join(HOME, ".local", "bin");
  return {
    ...process.env,
    PATH: localBinDir + path.delimiter + envPath,
    ...claudeEnv
  };
}

function mcClaudeRun(args, timeout) {
  return new Promise((resolve, reject) => {
    const claudePath = getClaudePath();
    const bareArgs = ["--bare", "--dangerously-skip-permissions"].concat(args);
    const env = buildClaudeEnv();
    const cwd = CONFIG_DIR;

    let proc;
    if (process.platform === "win32") {
      // Windows: spawn directly, no login shell
      proc = spawn(claudePath, bareArgs, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    } else {
      // macOS/Linux: spawn through login shell for env inheritance
      const shellBin = process.env.SHELL || "/bin/zsh";
      const escapedArgs = bareArgs.map(a => "'" + a.replace(/'/g, "'\\''") + "'").join(" ");
      proc = spawn(shellBin, ["-l", "-c", claudePath + " " + escapedArgs], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    }

    proc.stdin.end();
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => { proc.kill(); reject(new Error("timeout")); }, timeout || 90000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error("exit " + code), { stdout, stderr, code }));
    });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// --- Data file paths ---
const MC_DIR = path.join(HOME, ".memory", "mission-control");
const MC_TODOS = path.join(MC_DIR, "todos.md");
const MC_WAITING = path.join(MC_DIR, "waiting-on.md");
const MC_CALENDAR = path.join(MC_DIR, "calendar-cache.json");
const MC_NEWS = path.join(MC_DIR, "news-cache.json");
const MC_TIMESAVED = path.join(MC_DIR, "time-saved.json");
const MC_MARKET = path.join(MC_DIR, "market-cache.json");
const MC_WATCHLIST = path.join(MC_DIR, "market-watchlist.json");
const MC_SLACKPULSE = path.join(MC_DIR, "slack-pulse.json");
const MC_COSTS = path.join(MC_DIR, "cost-tracker.json");
const MC_GCAL_MCP = path.join(CONFIG_DIR, "gcal-mcp.json");
const MC_CLAUDE_JSON = path.join(HOME, ".claude.json");

function ensureDataDir() {
  fs.mkdirSync(MC_DIR, { recursive: true });
}

// --- IPC Handlers ---
function registerHandlers() {

  // Home path (sync for preload)
  ipcMain.on("mc:getHomePathSync", (event) => { event.returnValue = HOME; });

  // Config
  ipcMain.handle("mc:getConfig", async () => getMcConfig());

  // Open external URL/file
  ipcMain.handle("mc:openExternal", async (_, url) => {
    let target = url;
    if (target.startsWith("~")) target = path.join(HOME, target.slice(1));
    if (!target.startsWith("http") && !target.startsWith("file://")) target = "file://" + target;
    shell.openExternal(target);
  });

  // --- Todos ---
  ipcMain.handle("mc:loadTodos", async () => {
    try { return await fsp.readFile(MC_TODOS, "utf-8"); } catch { return ""; }
  });
  ipcMain.handle("mc:saveTodos", async (_, content) => {
    await fsp.mkdir(path.dirname(MC_TODOS), { recursive: true });
    await fsp.writeFile(MC_TODOS, content, "utf-8");
  });
  ipcMain.handle("mc:watchTodos", async () => {
    try { return await fsp.readFile(MC_TODOS, "utf-8"); } catch { return ""; }
  });

  // --- Voice Recognition (Windows native) ---
  let voiceProc = null;
  ipcMain.handle("mc:voiceStart", async () => {
    if (voiceProc) { try { voiceProc.kill(); } catch {} voiceProc = null; }
    return new Promise((resolve) => {
      const scriptPath = path.join(MC_DIR, "_voice.ps1");
      fs.writeFileSync(scriptPath, `
Add-Type -AssemblyName System.Speech
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToDefaultAudioDevice()
$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
$rec.add_SpeechRecognized({
  param($s, $e)
  [Console]::WriteLine("TEXT:" + $e.Result.Text)
  [Console]::Out.Flush()
})
$rec.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
[Console]::WriteLine("READY")
[Console]::Out.Flush()
[Console]::ReadLine()
$rec.RecognizeAsyncCancel()
$rec.Dispose()
`);
      voiceProc = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { stdio: ["pipe", "pipe", "pipe"] });
      let started = false;
      voiceProc.stdout.on("data", (d) => {
        const lines = d.toString().split(/\r?\n/);
        for (const line of lines) {
          if (line.trim() === "READY" && !started) { started = true; resolve({ ok: true }); }
          if (line.startsWith("TEXT:")) {
            const text = line.slice(5).trim();
            if (text) BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send("voice:text", text); });
          }
        }
      });
      voiceProc.stderr.on("data", (d) => { console.log("[VOICE STDERR]", d.toString()); });
      voiceProc.on("error", (err) => { voiceProc = null; if (!started) resolve({ ok: false, error: err.message }); });
      voiceProc.on("close", () => { voiceProc = null; });
      setTimeout(() => { if (!started) { if (voiceProc) { try { voiceProc.kill(); } catch {} voiceProc = null; } resolve({ ok: false, error: "timeout starting speech engine" }); } }, 8000);
    });
  });

  ipcMain.handle("mc:voiceStop", async () => {
    if (voiceProc) {
      try { voiceProc.stdin.write("\n"); voiceProc.stdin.end(); } catch {}
      setTimeout(() => { if (voiceProc) { try { voiceProc.kill(); } catch {} voiceProc = null; } }, 2000);
    }
    return { ok: true };
  });

  // Recognize speech from WAV buffer via local faster-whisper
  ipcMain.handle("mc:voiceRecognize", async (_, wavArray) => {
    try {
      const wavPath = path.join(MC_DIR, "_voice_clip.wav");
      fs.writeFileSync(wavPath, Buffer.from(wavArray));
      const scriptPath = path.join(MC_DIR, "_whisper_transcribe.py");
      fs.writeFileSync(scriptPath, `
import sys, json
from faster_whisper import WhisperModel
model = WhisperModel("base.en", device="cpu", compute_type="int8")
segments, _ = model.transcribe(sys.argv[1], language="en")
text = " ".join(s.text.strip() for s in segments).strip()
print(json.dumps({"text": text}))
`);
      const { stdout, stderr } = await execFileAsync("python", [scriptPath, wavPath], { timeout: 30000 });
      const result = JSON.parse(stdout.toString().trim());
      if (result.text) return { ok: true, text: result.text };
      return { ok: false, error: "no speech detected" };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // --- Email Triage ---
  ipcMain.handle("mc:emailTriage", async () => {
    try {
      const prompt = `Search Gmail for unread emails from the last 3 days using query "is:unread in:inbox newer_than:3d" (max 20 results). For each email, fetch its full content. Then categorize each email and return ONLY valid JSON (no markdown, no explanation) in this exact format:
[{"sender":"name","subject":"subject line","summary":"one-line action summary","priority":"high","category":"action-required"},...]
Priority must be "high", "medium", or "low". Category must be one of: "action-required", "respond", "review", "fyi", "skip".
For high: things needing approval, deadlines, escalations, direct asks from leadership.
For medium: questions to answer, meeting follow-ups, documents to review.
For low: newsletters, FYIs, automated notifications.
Only include emails that are "action-required", "respond", or "review" — skip "fyi" and "skip" categories.
If no unread emails, return an empty array: []`;
      const cliArgs = ["-p", prompt];
      if (fs.existsSync(MC_CLAUDE_JSON)) {
        cliArgs.unshift("--mcp-config", MC_CLAUDE_JSON);
      }
      const { stdout } = await mcClaudeRun(cliArgs, 120000);
      try {
        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (jsonMatch) return { ok: true, emails: JSON.parse(jsonMatch[0]) };
      } catch {}
      return { ok: true, emails: [] };
    } catch (err) { return { ok: false, error: err.message, emails: [] }; }
  });

  // --- Waiting On ---
  ipcMain.handle("mc:loadWaiting", async () => {
    try { return await fsp.readFile(MC_WAITING, "utf-8"); } catch { return ""; }
  });
  ipcMain.handle("mc:saveWaiting", async (_, content) => {
    try { await fsp.writeFile(MC_WAITING, content); return true; } catch { return false; }
  });

  // --- Calendar ---
  ipcMain.handle("mc:loadCalendar", async () => {
    try { return JSON.parse(await fsp.readFile(MC_CALENDAR, "utf-8")); } catch { return { today: [], tomorrow: [] }; }
  });

  let _calFailCount = 0;
  let _calLastFail = 0;
  ipcMain.handle("mc:refreshCalendar", async (_, forceRefresh) => {
    try {
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(await fsp.readFile(MC_CALENDAR, "utf-8"));
          if (cached.fetchedAt) {
            const age = Date.now() - new Date(cached.fetchedAt).getTime();
            if (age < 10 * 60 * 1000 && ((cached.today && cached.today.length > 0) || (cached.tomorrow && cached.tomorrow.length > 0))) return cached;
          }
        } catch {}
      }
      // Backoff on consecutive failures
      if (!forceRefresh && _calFailCount > 0) {
        const backoffMs = Math.min(_calFailCount * 10 * 60 * 1000, 30 * 60 * 1000);
        if (Date.now() - _calLastFail < backoffMs) {
          try { return JSON.parse(await fsp.readFile(MC_CALENDAR, "utf-8")); } catch {}
          return null;
        }
      }

      const config = getMcConfig();
      const calendarWebAppUrl = config.calendar?.webAppUrl;

      let data = null;

      // Strategy 1: Google Apps Script web app via Electron net.fetch (uses session cookies)
      if (calendarWebAppUrl) {
        try {
          const res = await net.fetch(calendarWebAppUrl + "?days=2", {
            headers: { "User-Agent": "MissionControl/1.0" },
            redirect: "follow"
          });
          const text = await res.text();
          // Check if we got a login redirect instead of JSON
          if (text.includes("ServiceLogin") || text.includes("<html") || !res.ok) {
            console.log("[Calendar] Google auth required — opening login window");
            // Open a visible window for the user to authenticate
            const authWin = new BrowserWindow({ width: 500, height: 700, title: "Sign in to Google Calendar" });
            authWin.loadURL(calendarWebAppUrl + "?days=2");
            // Wait for the user to complete auth and get redirected back to JSON
            await new Promise((resolve) => {
              authWin.webContents.on("did-finish-load", async () => {
                try {
                  const pageContent = await authWin.webContents.executeJavaScript("document.body.innerText");
                  if (pageContent.includes('"today"') && pageContent.includes('"tomorrow"')) {
                    const jsonMatch2 = pageContent.match(/\{[\s\S]*"today"[\s\S]*"tomorrow"[\s\S]*\}/);
                    if (jsonMatch2) { try { data = JSON.parse(jsonMatch2[0]); } catch {} }
                    authWin.close();
                    resolve();
                  }
                } catch {}
              });
              authWin.on("closed", resolve);
            });
          } else {
            const jsonMatch = text.match(/\{[\s\S]*"today"[\s\S]*"tomorrow"[\s\S]*\}/);
            if (jsonMatch) {
              try { data = JSON.parse(jsonMatch[0]); } catch {}
            }
          }
        } catch (err) {
          console.log("[Calendar] Apps Script fetch failed:", err.message);
        }
      }

      // Strategy 2: Claude CLI with gcal MCP (fallback)
      if (!data) {
        try {
          const todayStr = new Date().toISOString().slice(0, 10);
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
          const dayAfterStr = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
          const prompt = "Use mcp__gcalgusto__list_events to get events for time_min=" + todayStr + "T00:00:00 and time_max=" + dayAfterStr + "T00:00:00, max_results=30. Return ONLY this JSON, no markdown fences:\n{\"today\":[{\"title\":\"Name\",\"time\":\"9:00 AM\",\"attendees\":3,\"location\":\"\"}],\"tomorrow\":[...]}\nRules: Convert times to h:mm AM/PM Pacific. Count attendees as number. Skip all-day events named Home. Split by date: " + todayStr + "=today, " + tomorrowStr + "=tomorrow. Sort by time.";

          const cliArgs = ["-p", prompt];
          if (fs.existsSync(MC_GCAL_MCP)) {
            cliArgs.unshift("--mcp-config", MC_GCAL_MCP);
          }
          const { stdout } = await mcClaudeRun(cliArgs, 90000);
          const jsonMatch = stdout.match(/\{[\s\S]*"today"[\s\S]*"tomorrow"[\s\S]*\}/);
          if (jsonMatch) {
            try { data = JSON.parse(jsonMatch[0]); } catch {}
          }
        } catch (err) {
          console.log("[Calendar] Claude CLI fallback failed:", err.message);
        }
      }

      if (data && (data.today || data.tomorrow)) {
        data.fetchedAt = new Date().toISOString();
        await fsp.mkdir(path.dirname(MC_CALENDAR), { recursive: true });
        await fsp.writeFile(MC_CALENDAR, JSON.stringify(data, null, 2), "utf-8");
        _calFailCount = 0;
        return data;
      }
      try { return JSON.parse(await fsp.readFile(MC_CALENDAR, "utf-8")); } catch {}
      return null;
    } catch (err) {
      _calFailCount++;
      _calLastFail = Date.now();
      try { return JSON.parse(await fsp.readFile(MC_CALENDAR, "utf-8")); } catch {}
      return null;
    }
  });

  // --- Slack draft & send ---
  ipcMain.handle("mc:draftSlack", async (_, rawText, recipientName) => {
    try {
      const config = getMcConfig();
      const userName = config.user?.name || "the user";
      const voice = config.slack?.draftVoice || "direct, concise, collaborative";
      const draftPrompt = "Draft a Slack message from " + userName + " to " + recipientName + ". The raw intent is: " + rawText + ". Write it in this voice: " + voice + ". Return ONLY the message text, no quotes, no explanation. Keep it short.";
      const { stdout } = await mcClaudeRun(["-p", draftPrompt], 30000);
      return stdout.trim();
    } catch { return rawText; }
  });

  // Direct MCP call helper — bypasses Claude CLI for speed
  async function mcpCall(serverName, toolName, args) {
    const claudeJson = JSON.parse(await fsp.readFile(MC_CLAUDE_JSON, "utf-8"));
    const server = claudeJson.mcpServers?.[serverName];
    if (!server?.url) throw new Error("MCP server " + serverName + " not found");
    const url = server.url;
    const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
    // Step 1: Initialize
    const initRes = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "command-center", version: "1.0.0" } }, id: 1 }), signal: AbortSignal.timeout(10000) });
    const sessionId = initRes.headers.get("mcp-session-id");
    const sessionHeaders = sessionId ? { ...headers, "mcp-session-id": sessionId } : headers;
    // Step 2: Initialized notification
    await fetch(url, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), signal: AbortSignal.timeout(5000) });
    // Step 3: Call tool
    const callRes = await fetch(url, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: { name: toolName, arguments: args }, id: 2 }), signal: AbortSignal.timeout(15000) });
    const callText = await callRes.text();
    // Handle SSE or JSON response
    if (callText.startsWith("{")) return JSON.parse(callText);
    const lines = callText.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      try { const d = JSON.parse(line.slice(6)); if (d.id === 2) return d; } catch {}
    }
    throw new Error("No response from MCP tool");
  }

  ipcMain.handle("mc:sendSlack", async (_, channelId, message) => {
    try {
      const config = getMcConfig();
      const sig = config.user?.slackSignature || "_Sent by Claude Code_ :claude:";
      const fullMsg = message + "\n\n" + sig;
      const result = await mcpCall("slackgustoofficialmcp", "slack_send_message", { channel_id: channelId, message: fullMsg });
      if (result.error) return { ok: false, error: result.error.message || "MCP error" };
      return { ok: true, result: "sent" };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // --- Slack Pulse ---
  ipcMain.handle("mc:slackPulse", async (_, forceRefresh) => {
    try {
      const config = getMcConfig();
      const channels = config.slack?.pulseChannels || [];
      if (channels.length === 0) return { channels: [], fetchedAt: null };
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(await fsp.readFile(MC_SLACKPULSE, "utf-8"));
          if (cached.fetchedAt) {
            const age = Date.now() - new Date(cached.fetchedAt).getTime();
            if (age < 10 * 60 * 1000 && cached.channels) return cached;
          }
        } catch {}
      }
      const channelList = channels.map(c => c.id + " (" + c.name + ")").join(", ");
      const prompt = "Use slack_read_channel to read the 3 most recent messages from each of these channels: " + channelList + ". Count how many were posted today. Return ONLY valid JSON array: [{\"channel\":\"#channel-name\",\"todayCount\":0,\"hasMention\":false,\"latestMessage\":\"first 60 chars of newest msg\"}]";
      const cliArgs = ["-p", prompt];
      if (fs.existsSync(MC_CLAUDE_JSON)) {
        cliArgs.unshift("--mcp-config", MC_CLAUDE_JSON);
      }
      const { stdout } = await mcClaudeRun(cliArgs, 90000);
      let resultChannels = [];
      try {
        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (jsonMatch) resultChannels = JSON.parse(jsonMatch[0]);
      } catch {}
      const result = { channels: resultChannels, fetchedAt: new Date().toISOString() };
      if (resultChannels.length > 0) await fsp.writeFile(MC_SLACKPULSE, JSON.stringify(result, null, 2));
      return result;
    } catch { return { channels: [], fetchedAt: null }; }
  });

  // --- Recent Sessions ---
  ipcMain.handle("mc:recentProjects", async () => {
    try {
      const histFile = path.join(HOME, ".claude", "history.jsonl");
      const raw = await fsp.readFile(histFile, "utf-8");
      const lines = raw.trim().split("\n");
      const sessMap = {};
      for (const line of lines) {
        try {
          const d = JSON.parse(line);
          const sid = d.sessionId; if (!sid) continue;
          const msg = (d.display || "").trim();
          const ts = d.timestamp || 0;
          const proj = d.project || "";
          if (!sessMap[sid]) {
            sessMap[sid] = { id: sid, title: msg, project: proj, start: ts, last: ts, msgs: 1 };
          } else {
            sessMap[sid].last = Math.max(sessMap[sid].last, ts);
            sessMap[sid].msgs++;
            if (msg.length > sessMap[sid].title.length && !msg.startsWith("/") && sessMap[sid].title.length < 30) {
              sessMap[sid].title = msg;
            }
          }
        } catch {}
      }
      const sorted = Object.values(sessMap).sort((a, b) => b.last - a.last).slice(0, 50);
      const deduped = [];
      for (const s of sorted) {
        const dup = deduped.find(d => d.project === s.project && Math.abs(d.last - s.last) < 30 * 60 * 1000);
        if (dup) { if (s.msgs > dup.msgs) Object.assign(dup, s); continue; }
        deduped.push(s);
      }
      // Look up customTitle from session JSONL files
      const top = deduped.slice(0, 30);
      const projDir = path.join(HOME, ".claude", "projects");
      try {
        const dirs = await fsp.readdir(projDir);
        await Promise.all(top.map(async (s) => {
          for (const dir of dirs) {
            const jsonlPath = path.join(projDir, dir, s.id + ".jsonl");
            try {
              const stat = await fsp.stat(jsonlPath);
              const readSize = Math.min(stat.size, 20000);
              const buf = Buffer.alloc(readSize);
              const fh = await fsp.open(jsonlPath, "r");
              await fh.read(buf, 0, readSize, Math.max(0, stat.size - readSize));
              await fh.close();
              const chunk = buf.toString("utf-8");
              const chunkLines = chunk.split("\n");
              for (let i = chunkLines.length - 1; i >= 0; i--) {
                try {
                  const entry = JSON.parse(chunkLines[i]);
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
        name: s.customTitle || (s.title || "").slice(0, 60) || s.project.split(/[\\/]/).pop() || "Session",
        lastOpened: s.last,
        sessionId: s.id,
        msgCount: s.msgs
      }));
    } catch { return []; }
  });

  // --- News (GitHub API via fetch, no gh CLI needed) ---
  ipcMain.handle("mc:loadNews", async () => {
    try { return JSON.parse(await fsp.readFile(MC_NEWS, "utf-8")); } catch { return null; }
  });

  ipcMain.handle("mc:refreshNews", async (_, forceRefresh) => {
    try {
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(await fsp.readFile(MC_NEWS, "utf-8"));
          if (cached.fetchedAt) {
            const age = Date.now() - new Date(cached.fetchedAt).getTime();
            if (age < 24 * 60 * 60 * 1000 && cached.items && cached.items.length > 0) return cached;
          }
        } catch {}
      }
      const res = await fetch("https://api.github.com/repos/anthropics/claude-code/releases?per_page=10", {
        headers: { "User-Agent": "MissionControl/1.0", "Accept": "application/vnd.github+json" }
      });
      if (!res.ok) return null;
      const releases = await res.json();
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
      await fsp.writeFile(MC_NEWS, JSON.stringify(result, null, 2));
      return result;
    } catch { return null; }
  });

  // --- Time Saved ---
  ipcMain.handle("mc:logTimeSaved", async (_, action, minutesSaved) => {
    try {
      let data = {};
      try { data = JSON.parse(await fsp.readFile(MC_TIMESAVED, "utf-8")); } catch {}
      const today = new Date().toISOString().slice(0, 10);
      if (!data[today]) data[today] = { total: 0, actions: [] };
      data[today].total += minutesSaved;
      data[today].actions.push({ action, minutes: minutesSaved, at: new Date().toISOString() });
      const keys = Object.keys(data).sort().reverse();
      if (keys.length > 30) { for (const k of keys.slice(30)) delete data[k]; }
      await fsp.writeFile(MC_TIMESAVED, JSON.stringify(data, null, 2));
      return true;
    } catch { return false; }
  });

  ipcMain.handle("mc:getTimeSaved", async () => {
    try {
      const data = JSON.parse(await fsp.readFile(MC_TIMESAVED, "utf-8"));
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

  // --- Costs ---
  ipcMain.handle("mc:loadCosts", async () => {
    try {
      const data = JSON.parse(await fsp.readFile(MC_COSTS, "utf-8"));
      const today = new Date().toISOString().slice(0, 10);
      return data[today] || {};
    } catch { return {}; }
  });

  ipcMain.handle("mc:saveCosts", async (_, tabCosts) => {
    try {
      let data = {};
      try { data = JSON.parse(await fsp.readFile(MC_COSTS, "utf-8")); } catch {}
      const today = new Date().toISOString().slice(0, 10);
      data[today] = tabCosts;
      const keys = Object.keys(data).sort().reverse();
      if (keys.length > 30) { for (const k of keys.slice(30)) delete data[k]; }
      await fsp.mkdir(path.dirname(MC_COSTS), { recursive: true });
      await fsp.writeFile(MC_COSTS, JSON.stringify(data, null, 2));
      return true;
    } catch { return false; }
  });

  // --- Meeting Context ---
  ipcMain.handle("mc:meetingContext", async (_, meetingTitle) => {
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

  // --- Watchlist ---
  function getWatchlistTickers(config) {
    try {
      const wl = JSON.parse(fs.readFileSync(MC_WATCHLIST, "utf-8"));
      if (Array.isArray(wl) && wl.length > 0) return wl;
    } catch {}
    return config.markets?.tickers || [
      { symbol: "^DJI", name: "Dow Jones" },
      { symbol: "^GSPC", name: "S&P 500" },
      { symbol: "^IXIC", name: "Nasdaq" },
      { symbol: "IGV", name: "Software (IGV)" }
    ];
  }

  ipcMain.handle("mc:getWatchlist", async () => {
    const config = getMcConfig();
    return getWatchlistTickers(config);
  });

  ipcMain.handle("mc:saveWatchlist", async (_, tickers) => {
    ensureDataDir();
    await fsp.writeFile(MC_WATCHLIST, JSON.stringify(tickers, null, 2));
    // Invalidate market cache so next fetch uses the new list
    try { await fsp.unlink(MC_MARKET); } catch {}
    return true;
  });

  // --- Market Data (Yahoo Finance) ---
  ipcMain.handle("mc:marketData", async (_, forceRefresh) => {
    try {
      const config = getMcConfig();
      if (config.markets?.enabled === false) return { quotes: [], fetchedAt: null };
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(await fsp.readFile(MC_MARKET, "utf-8"));
          if (cached.fetchedAt) {
            const age = Date.now() - new Date(cached.fetchedAt).getTime();
            if (age < 5 * 60 * 1000 && cached.quotes && cached.quotes.length > 0) return cached;
          }
        } catch {}
      }
      const tickers = getWatchlistTickers(config);
      async function fetchChart(sym) {
        try {
          const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?interval=1d&range=2d";
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
          const d = await res.json();
          const meta = d.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose || price;
          const change = price - prev;
          const changePct = prev > 0 ? (change / prev) * 100 : 0;
          return { price, change, changePct };
        } catch { return null; }
      }
      const results = await Promise.all(tickers.map(t => fetchChart(t.symbol)));
      const quotes = tickers.map((t, i) => results[i] ? { symbol: t.symbol, name: t.name, price: results[i].price, change: results[i].change, changePct: results[i].changePct } : null).filter(Boolean);
      const result = { quotes, fetchedAt: new Date().toISOString() };
      if (quotes.length > 0) await fsp.writeFile(MC_MARKET, JSON.stringify(result, null, 2));
      return result;
    } catch { return { quotes: [], fetchedAt: null }; }
  });

  // --- MCP Status ---
  ipcMain.handle("mc:mcpStatus", async () => {
    try {
      const claudePath = getClaudePath();
      const env = buildClaudeEnv();
      const { stdout } = await execFileAsync(claudePath, ["mcp", "list"], { timeout: 30000, maxBuffer: 1024 * 1024, env });
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
      return {
        servers,
        connected: servers.filter(s => s.status === "connected").length,
        needsAuth: servers.filter(s => s.status === "needs_auth").length,
        errored: servers.filter(s => s.status === "error").length,
        total: servers.length,
        fetchedAt: new Date().toISOString()
      };
    } catch { return { servers: [], connected: 0, needsAuth: 0, errored: 0, total: 0, fetchedAt: null }; }
  });

  // --- Desktop Notifications ---
  ipcMain.handle("mc:notify", async (_, title, body) => {
    try {
      if (Notification.isSupported()) {
        const n = new Notification({ title: title || "Command Center", body: body || "", silent: false });
        n.show();
        return true;
      }
      return false;
    } catch { return false; }
  });

  // --- PTY (terminal) ---
  ipcMain.handle("mc:createPty", async (event, projectPath, command) => {
    if (!pty) throw new Error("node-pty not available");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error("No window");
    const id = "pty-" + (nextPtyId++);
    const shellBin = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/bash");
    const shellArgs = process.platform === "win32" ? [] : ["-l"];
    const ptyProc = pty.spawn(shellBin, shellArgs, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: projectPath || HOME,
      env: { ...process.env, TERM: "xterm-256color" }
    });
    // If a command was provided, start Claude Code and send it once ready
    if (command) {
      let commandSent = false;
      let outputBuf = "";
      const onReady = (data) => {
        if (commandSent) return;
        outputBuf += data;
        // Detect Claude Code's input prompt (waiting for user input)
        if (outputBuf.includes(">") && outputBuf.length > 200) {
          commandSent = true;
          setTimeout(() => { ptyProc.write(command + "\r"); }, 500);
        }
      };
      ptyProc.onData(onReady);
      // Fallback: send after 15s even if prompt not detected
      setTimeout(() => { if (!commandSent) { commandSent = true; ptyProc.write(command + "\r"); } }, 15000);
      setTimeout(() => { ptyProc.write("claude\r"); }, 500);
    }
    ptyProc.onData((data) => { if (!win.isDestroyed()) win.webContents.send("pty:data", id, data); });
    ptyProc.onExit(() => { sessions.delete(id); if (!win.isDestroyed()) win.webContents.send("pty:exit", id); });
    sessions.set(id, { process: ptyProc, projectPath });
    return id;
  });

  ipcMain.handle("mc:createPtyResume", async (event, projectPath, sessionId) => {
    if (!pty) throw new Error("node-pty not available");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error("No window");
    const id = "pty-" + (nextPtyId++);
    const shellBin = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/bash");
    const shellArgs = process.platform === "win32" ? [] : ["-l"];
    const ptyProc = pty.spawn(shellBin, shellArgs, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: projectPath || HOME,
      env: { ...process.env, TERM: "xterm-256color" }
    });
    // Send resume command after shell starts
    setTimeout(() => { ptyProc.write("claude --resume " + sessionId + "\r"); }, 500);
    ptyProc.onData((data) => { if (!win.isDestroyed()) win.webContents.send("pty:data", id, data); });
    ptyProc.onExit(() => { sessions.delete(id); if (!win.isDestroyed()) win.webContents.send("pty:exit", id); });
    sessions.set(id, { process: ptyProc, projectPath });
    return id;
  });

  ipcMain.handle("mc:writePty", async (_, id, data) => {
    const s = sessions.get(id);
    if (s) s.process.write(data);
  });

  ipcMain.handle("mc:resizePty", async (_, id, cols, rows) => {
    const s = sessions.get(id);
    if (s) s.process.resize(cols, rows);
  });

  ipcMain.handle("mc:destroyPty", async (_, id) => {
    const s = sessions.get(id);
    if (s) { s.process.kill(); sessions.delete(id); }
  });
}

// --- Window creation ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#1e1e1e",
    title: "Command Center",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  // Log renderer console messages and errors to stdout
  win.webContents.on("console-message", (_, level, message, line, sourceId) => {
    const prefix = level >= 2 ? "RENDERER ERROR" : "RENDERER";
    console.log(`[${prefix}] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on("did-fail-load", (_, code, desc, url) => {
    console.log(`[LOAD FAILED] ${code} ${desc} ${url}`);
  });

  // Grant microphone permission for voice dictation
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media" || permission === "microphone") return callback(true);
    callback(true);
  });
  win.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === "media" || permission === "microphone") return true;
    return true;
  });

  win.loadURL("http://127.0.0.1:" + localServerPort + "/index.html");

  // Open dev tools in dev mode
  if (process.argv.includes("--dev")) {
    win.webContents.openDevTools();
  }

  return win;
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  await startLocalServer();
  // Allow CDN scripts (React, xterm) by setting a permissive CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"]
      }
    });
  });

  ensureConfig();
  ensureDataDir();
  registerHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Clean up PTY sessions
  for (const [id, s] of sessions) {
    try { s.process.kill(); } catch {}
  }
  sessions.clear();
  if (process.platform !== "darwin") app.quit();
});
