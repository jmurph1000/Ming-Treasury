// Command Center — Preload Script
// Exposes IPC bridge to the renderer via contextBridge

const { contextBridge, ipcRenderer, webFrame } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Zoom
  zoomIn: () => { webFrame.setZoomLevel(Math.min(webFrame.getZoomLevel() + 0.5, 5)); return webFrame.getZoomLevel(); },
  zoomOut: () => { webFrame.setZoomLevel(Math.max(webFrame.getZoomLevel() - 0.5, -5)); return webFrame.getZoomLevel(); },
  zoomReset: () => { webFrame.setZoomLevel(0); return 0; },
  getZoomLevel: () => webFrame.getZoomLevel(),
  // Config
  mcGetConfig: () => ipcRenderer.invoke("mc:getConfig"),

  // Todos
  mcLoadTodos: () => ipcRenderer.invoke("mc:loadTodos"),
  mcSaveTodos: (content) => ipcRenderer.invoke("mc:saveTodos", content),
  mcWatchTodos: () => ipcRenderer.invoke("mc:watchTodos"),

  // Voice Recognition
  mcVoiceStart: () => ipcRenderer.invoke("mc:voiceStart"),
  mcVoiceStop: () => ipcRenderer.invoke("mc:voiceStop"),
  mcVoiceRecognize: (wavBuffer) => ipcRenderer.invoke("mc:voiceRecognize", wavBuffer),
  onVoiceText: (callback) => ipcRenderer.on("voice:text", (_, text) => callback(text)),

  // Email Triage
  mcEmailTriage: () => ipcRenderer.invoke("mc:emailTriage"),

  // Calendar
  mcLoadCalendar: () => ipcRenderer.invoke("mc:loadCalendar"),
  mcRefreshCalendar: (force) => ipcRenderer.invoke("mc:refreshCalendar", force),

  // Slack
  mcDraftSlack: (rawText, recipientName) => ipcRenderer.invoke("mc:draftSlack", rawText, recipientName),
  mcSendSlack: (channelId, message) => ipcRenderer.invoke("mc:sendSlack", channelId, message),
  mcSlackPulse: (force) => ipcRenderer.invoke("mc:slackPulse", force),

  // Sessions
  mcRecentProjects: () => ipcRenderer.invoke("mc:recentProjects"),

  // News
  mcLoadNews: () => ipcRenderer.invoke("mc:loadNews"),
  mcRefreshNews: (force) => ipcRenderer.invoke("mc:refreshNews", force),

  // Time Saved
  mcLogTimeSaved: (action, minutes) => ipcRenderer.invoke("mc:logTimeSaved", action, minutes),
  mcGetTimeSaved: () => ipcRenderer.invoke("mc:getTimeSaved"),

  // Costs
  mcLoadCosts: () => ipcRenderer.invoke("mc:loadCosts"),
  mcSaveCosts: (tabCosts) => ipcRenderer.invoke("mc:saveCosts", tabCosts),

  // Waiting
  mcLoadWaiting: () => ipcRenderer.invoke("mc:loadWaiting"),
  mcSaveWaiting: (content) => ipcRenderer.invoke("mc:saveWaiting", content),

  // Meeting
  mcMeetingContext: (title) => ipcRenderer.invoke("mc:meetingContext", title),

  // Markets
  mcMarketData: (force) => ipcRenderer.invoke("mc:marketData", force),
  mcGetWatchlist: () => ipcRenderer.invoke("mc:getWatchlist"),
  mcSaveWatchlist: (tickers) => ipcRenderer.invoke("mc:saveWatchlist", tickers),

  // MCP
  mcMcpStatus: () => ipcRenderer.invoke("mc:mcpStatus"),

  // External
  mcOpenExternal: (url) => ipcRenderer.invoke("mc:openExternal", url),
  mcNotify: (title, body) => ipcRenderer.invoke("mc:notify", title, body),

  // PTY (terminal)
  createPty: (projectPath, command) => ipcRenderer.invoke("mc:createPty", projectPath, command),
  createPtyResume: (projectPath, sessionId) => ipcRenderer.invoke("mc:createPtyResume", projectPath, sessionId),
  writePty: (id, data) => ipcRenderer.invoke("mc:writePty", id, data),
  resizePty: (id, cols, rows) => ipcRenderer.invoke("mc:resizePty", id, cols, rows),
  destroyPty: (id) => ipcRenderer.invoke("mc:destroyPty", id),
  onPtyData: (callback) => ipcRenderer.on("pty:data", (_, id, data) => callback(id, data)),
  onPtyExit: (callback) => ipcRenderer.on("pty:exit", (_, id) => callback(id)),

  // Utility
  getHomePath: () => ipcRenderer.sendSync("mc:getHomePathSync")
});
