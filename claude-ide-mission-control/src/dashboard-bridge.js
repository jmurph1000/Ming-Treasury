// Mission Control — Dashboard Bridge
// Thin wrapper that renders the standalone dashboard.html in an iframe
// and proxies API calls via postMessage. Replaces the old 1000+ line dashboard.js splice.

function parseTodos(content) {
  if (!content) return [];
  var todoLines = content.split("\n");
  var todos = [];
  for (var idx = 0; idx < todoLines.length; idx++) {
    var todoLine = todoLines[idx];
    var match = todoLine.match(/^[-*]\s+\[([x ])\]\s+(?:\*\*(!!|!)\*\*\s+)?(.+)/i);
    if (match) {
      var done = match[1].toLowerCase() === "x";
      var prio = match[2] === "!!" ? "high" : match[2] === "!" ? "medium" : "low";
      var desc = match[3].trim();
      todos.push({ done: done, priority: prio, description: desc, lineIndex: idx });
    }
  }
  return todos;
}
function todosToMarkdown(todos) {
  return todos.map(function(t) {
    var check = t.done ? "x" : " ";
    var prioMark = t.priority === "high" ? "**!!** " : t.priority === "medium" ? "**!** " : "";
    return "- [" + check + "] " + prioMark + t.description;
  }).join("\n") + "\n";
}
function Dashboard({ visible }) {
  const { state, dispatch } = useAppState();
  const iframeRef = reactExports.useRef(null);
  const iframeReady = reactExports.useRef(false);
  const tabsRef = reactExports.useRef(state.tabs);
  const ptyBuffers = reactExports.useRef({});
  const tabCosts = reactExports.useRef({});
  const costsLoaded = reactExports.useRef(false);

  // Keep tabsRef current for pty data handler
  tabsRef.current = state.tabs;

  // Resolve home path for dashboard iframe URL
  reactExports.useEffect(function() {
    if (!window.__mcHome && window.api && window.api.getHomePath) {
      try { window.__mcHome = window.api.getHomePath(); } catch(e) {}
    }
  }, []);

  // Load persisted costs on first render
  reactExports.useEffect(function() {
    window.api.mcLoadCosts().then(function(saved) {
      if (saved && Object.keys(saved).length > 0) {
        Object.assign(tabCosts.current, saved);
        costsLoaded.current = true;
      } else {
        costsLoaded.current = true;
      }
    }).catch(function() { costsLoaded.current = true; });
  }, []);

  // Track per-tab cost: update active tab's cost on every render, sum all (including closed)
  var activeCost = parseFloat(((state.claudeStatus && state.claudeStatus.cost) || "0").replace(/[^0-9.]/g, "")) || 0;
  if (state.activeTabId && activeCost > 0) {
    var prev = tabCosts.current[state.activeTabId] || 0;
    tabCosts.current[state.activeTabId] = activeCost;
    // Persist when cost changes for this tab
    if (costsLoaded.current && activeCost !== prev) {
      window.api.mcSaveCosts(tabCosts.current);
    }
  }
  var totalCost = 0;
  var costKeys = Object.keys(tabCosts.current);
  for (var ci = 0; ci < costKeys.length; ci++) totalCost += tabCosts.current[costKeys[ci]];
  var totalCostStr = "$" + totalCost.toFixed(2);

  // --- postMessage API bridge ---
  reactExports.useEffect(function() {
    function handler(e) {
      if (!e.data || !e.data.type) return;
      // Only accept messages from our iframe
      if (e.source !== iframeRef.current?.contentWindow) return;

      // API call proxy: dashboard calls window.api.* methods via postMessage
      if (e.data.type === "mc-api") {
        var method = e.data.method;
        var args = e.data.args || [];
        var id = e.data.id;
        var fn = window.api[method];
        if (!fn) {
          iframeRef.current?.contentWindow?.postMessage({ type: "mc-api-response", id: id, error: "Unknown method: " + method }, "*");
          return;
        }
        try {
          var result = fn.apply(null, args);
          // Handle both sync and async results
          Promise.resolve(result).then(function(val) {
            iframeRef.current?.contentWindow?.postMessage({ type: "mc-api-response", id: id, result: val }, "*");
          }).catch(function(err) {
            iframeRef.current?.contentWindow?.postMessage({ type: "mc-api-response", id: id, error: err.message || String(err) }, "*");
          });
        } catch (err) {
          iframeRef.current?.contentWindow?.postMessage({ type: "mc-api-response", id: id, error: err.message || String(err) }, "*");
        }
      }

      // Dispatch proxy: dashboard dispatches actions to app state
      if (e.data.type === "mc-dispatch") {
        dispatch(e.data.action);
      }

      // Terminal creation: dashboard requests a new terminal tab
      if (e.data.type === "mc-create-terminal") {
        var path = e.data.projectPath || state.projectPath || "/tmp";
        var termId = "terminal-" + Date.now();
        var cmd = e.data.command;
        var resumeId = e.data.resumeSessionId;
        var label = e.data.label || (cmd ? (cmd.length > 40 ? cmd.substring(0, 37) + "..." : cmd) : path.split("/").pop() || "Terminal");
        var createPromise;
        if (resumeId) {
          // Resume: use dedicated handler that writes "claude --resume <id>" instead of "claude"
          createPromise = window.api.mcCreatePtyResume(path, resumeId);
        } else if (cmd) {
          createPromise = window.api.createPtyWithPrompt(path, cmd);
        } else {
          createPromise = window.api.createPty(path);
        }
        createPromise.then(function(ptyId) {
          var tab = { id: termId, type: "terminal", label: label, closeable: true, ptyId: ptyId, projectPath: path };
          dispatch({ type: "ADD_TAB", tab: tab });
          window.api.addRecentSession(path);
        }).catch(function(err) {
          console.error("[MC Bridge] Failed to create terminal:", err);
        });
      }

      // Dashboard iframe reports ready
      if (e.data.type === "mc-dashboard-ready") {
        iframeReady.current = true;
        // Send initial state
        iframeRef.current?.contentWindow?.postMessage({
          type: "mc-state",
          state: {
            tabs: state.tabs,
            activeTabId: state.activeTabId,
            projectPath: state.projectPath,
            claudeStatus: Object.assign({}, state.claudeStatus, { cost: totalCostStr }),
            behavior: { featuresUsed: { size: state.behavior?.featuresUsed?.size || 0 } }
          }
        }, "*");
      }
    }
    window.addEventListener("message", handler);
    return function() { window.removeEventListener("message", handler); };
  }, [dispatch, state.projectPath, state.tabs, state.activeTabId, state.claudeStatus]);

  // --- Send state updates to iframe ---
  reactExports.useEffect(function() {
    if (!iframeReady.current || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage({
      type: "mc-state",
      state: {
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        projectPath: state.projectPath,
        claudeStatus: Object.assign({}, state.claudeStatus, { cost: totalCostStr }),
        behavior: { featuresUsed: { size: state.behavior?.featuresUsed?.size || 0 } }
      }
    }, "*");
  }, [state.tabs, state.activeTabId, state.projectPath, state.claudeStatus]);

  // --- Active pty tracking for drag-and-drop ---
  reactExports.useEffect(function() {
    var active = state.tabs.find(function(t) { return t.id === state.activeTabId && t.type === "terminal" && t.ptyId; });
    if (active && window.api.mcSetActivePty) window.api.mcSetActivePty(active.ptyId);
  }, [state.activeTabId, state.tabs]);

  // --- Auto-label terminal tabs on /rename + prompt detection for notifications ---
  var lastNotify = reactExports.useRef(0);
  reactExports.useEffect(function() {
    var promptPatterns = [
      // Standard CLI prompts
      /\[Y\/n\]/i, /\[y\/N\]/i, /\(yes\/no\)/i, /\(y\/n\)/i,
      /Continue\?/i, /Proceed\?/i, /Are you sure\?/i,
      /Enter (?:password|passphrase)/i, /Password:/i,
      /Press (?:Enter|any key)/i,
      /\?\s*›/,
      /Do you want to/i, /Would you like to/i, /Overwrite\?/i,
      /\[.*\/.*\]\s*[:?]\s*$/,
      // Claude Code specific
      /Allow\s+(?:once|always)\?/i,
      /Do you want to allow/i,
      /(?:Allow|Deny|Skip)\s*\(/,
      /waiting for (?:your|user) (?:response|input|approval)/i,
      /needs? (?:your |user )?(?:permission|approval|confirmation)/i,
      /\? \(Use arrow keys\)/,
      /Select (?:an? )?(?:option|choice)/i
    ];
    var titleDebounce = {};
    var unsub = window.api.onPtyData(function(ptyId, data) {
      var buf = ptyBuffers.current;
      if (!buf[ptyId]) buf[ptyId] = "";
      buf[ptyId] += data;
      if (buf[ptyId].length > 500) buf[ptyId] = buf[ptyId].slice(-500);

      // Capture OSC terminal title sequences before stripping (OSC 0 or 2: \x1b]0;title\x07)
      var oscMatches = data.match(/\x1b\](?:0|2);([^\x07]+)\x07/g);
      if (oscMatches) {
        var lastOsc = oscMatches[oscMatches.length - 1];
        var titleMatch = lastOsc.match(/\x1b\](?:0|2);([^\x07]+)\x07/);
        if (titleMatch) {
          var rawTitle = titleMatch[1].trim();
          // Debounce: only update if title changed and not too frequent
          if (rawTitle && rawTitle !== titleDebounce[ptyId]) {
            titleDebounce[ptyId] = rawTitle;
            var tabs = tabsRef.current;
            var tab = tabs.find(function(t2) { return t2.ptyId === ptyId && t2.type === "terminal"; });
            if (tab) {
              var label = rawTitle;
              if (label.length > 40) label = label.substring(0, 37) + "...";
              dispatch({ type: "UPDATE_TAB_LABEL", tabId: tab.id, label: label });
            }
          }
        }
      }

      var clean = buf[ptyId].replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");

      // Check for /rename (overrides OSC title)
      var m = clean.match(/Session renamed to:\s*(.+?)[\r\n]/);
      if (m) {
        buf[ptyId] = "";
        var tabs = tabsRef.current;
        var tab = tabs.find(function(t2) { return t2.ptyId === ptyId && t2.type === "terminal"; });
        if (tab) {
          var label = m[1].trim();
          if (label.length > 35) label = label.substring(0, 32) + "...";
          dispatch({ type: "UPDATE_TAB_LABEL", tabId: tab.id, label: label });
          titleDebounce[ptyId] = label;
        }
        return;
      }

      // Check for input prompts (throttle: max once per 15s)
      var now = Date.now();
      if (now - lastNotify.current < 15000) return;
      var lastLines = clean.split("\n").slice(-3).join("\n");
      for (var pi = 0; pi < promptPatterns.length; pi++) {
        if (promptPatterns[pi].test(lastLines)) {
          lastNotify.current = now;
          var tabs2 = tabsRef.current;
          var tab2 = tabs2.find(function(t2) { return t2.ptyId === ptyId && t2.type === "terminal"; });
          var tabLabel = tab2 ? tab2.label : "Terminal";
          var promptLine = lastLines.trim().split("\n").pop().trim();
          if (promptLine.length > 80) promptLine = promptLine.substring(0, 77) + "...";
          window.api.mcNotify("Terminal needs input", tabLabel + ": " + promptLine);
          break;
        }
      }
    });
    return function() { unsub(); };
  }, [dispatch]);

  // --- Stats posting ---
  reactExports.useEffect(function() {
    var post = function() {
      var sessions = state.tabs.filter(function(t2) { return t2.type === "terminal"; }).length;
      var features = state.behavior?.featuresUsed?.size || 0;
      window.api.postStats({ sessions: sessions, features: features, cost: totalCostStr });
    };
    post();
    var interval = setInterval(post, 5 * 60 * 1e3);
    return function() { clearInterval(interval); };
  }, [state.tabs, state.behavior?.featuresUsed, state.claudeStatus?.cost]);

  if (!visible) return null;

  var home = window.__mcHome || "/tmp";
  var dashPath = "file://" + home + "/.config/claude-ide-mc/dashboard.html";

  return jsxRuntimeExports.jsx("iframe", {
    ref: iframeRef,
    src: dashPath,
    style: { flex: 1, border: "none", width: "100%", height: "100%", background: "#1e1e1e" },
    sandbox: "allow-scripts allow-same-origin allow-popups"
  });
}
