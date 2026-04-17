
// Mission Control — Preload drag-and-drop handler
// Runs in preload context with access to electron.webUtils and ipcRenderer
(function() {
  var webUtils;
  try { webUtils = require("electron").webUtils; } catch(e) {}
  var ipcRenderer = require("electron").ipcRenderer;

  window.addEventListener("dragover", function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, true);

  window.addEventListener("drop", function(e) {
    e.preventDefault();
    e.stopPropagation();

    var ptyId = window.__mcActivePty;
    if (!ptyId) return;

    var paths = [];
    var files = e.dataTransfer.files;

    if (webUtils && files && files.length) {
      for (var i = 0; i < files.length; i++) {
        try {
          var p = webUtils.getPathForFile(files[i]);
          if (p) paths.push(p.indexOf(" ") >= 0 ? '"' + p + '"' : p);
        } catch(err) {}
      }
    }

    if (!paths.length) {
      (e.dataTransfer.getData("text/uri-list") || "").split("\n").forEach(function(u) {
        u = u.trim();
        if (u && u.startsWith("file://")) {
          var dp = decodeURIComponent(u.slice(7));
          paths.push(dp.indexOf(" ") >= 0 ? '"' + dp + '"' : dp);
        }
      });
    }

    if (!paths.length) {
      var txt = (e.dataTransfer.getData("text/plain") || "").trim();
      if (txt && (txt.startsWith("/") || txt.startsWith("~"))) {
        paths.push(txt.indexOf(" ") >= 0 ? '"' + txt + '"' : txt);
      }
    }

    if (paths.length) {
      ipcRenderer.send("pty:write", ptyId, paths.join(" "));
    }
  }, true);
})();
