    containerRef.current.addEventListener("dragover", function(ev) { ev.preventDefault(); ev.stopPropagation(); ev.dataTransfer.dropEffect = "copy"; }, true);
    containerRef.current.addEventListener("drop", function(ev) {
      ev.preventDefault(); ev.stopPropagation();
      var paths = [], files = ev.dataTransfer.files;
      for (var j = 0; j < (files ? files.length : 0); j++) {
        var fp = files[j].path;
        if (fp) paths.push(fp.indexOf(" ") >= 0 ? '"' + fp + '"' : fp);
      }
      if (!paths.length) {
        (ev.dataTransfer.getData("text/uri-list") || "").split("\n").forEach(function(u) {
          u = u.trim();
          if (u && u.startsWith("file://")) {
            var dp = decodeURIComponent(u.slice(7));
            paths.push(dp.indexOf(" ") >= 0 ? '"' + dp + '"' : dp);
          }
        });
      }
      if (!paths.length) {
        var tx = (ev.dataTransfer.getData("text/plain") || "").trim();
        if (tx && (tx.startsWith("/") || tx.startsWith("~"))) paths.push(tx.indexOf(" ") >= 0 ? '"' + tx + '"' : tx);
      }
      if (paths.length) window.api.writePty(ptyId, paths.join(" "));
    }, true);
