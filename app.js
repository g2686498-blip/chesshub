/**
 * CodeToSite - Pure client-side HTML/CSS/JS playground
 * Export produces clean files with ZERO branding of this tool.
 */

(function () {
  "use strict";

  // DOM refs
  const htmlCode = document.getElementById("html-code");
  const cssCode = document.getElementById("css-code");
  const jsCode = document.getElementById("js-code");
  const preview = document.getElementById("preview");
  const autoRun = document.getElementById("auto-run");
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");

  // State
  let debounceTimer = null;
  const DEBOUNCE_MS = 350;

  // Default starter content
  const DEFAULTS = {
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的网站</title>
</head>
<body>
  <h1>你好，世界！</h1>
  <p>这是一个由代码生成的独立网站。</p>
  <button id="btn">点我</button>
</body>
</html>`,
    css: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #e2e8f0;
  gap: 1rem;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(90deg, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

p {
  color: #94a3b8;
  font-size: 1.1rem;
}

button {
  margin-top: 1rem;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 999px;
  background: #38bdf8;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(56, 189, 248, 0.3);
}`,
    js: `document.getElementById("btn").addEventListener("click", () => {
  alert("欢迎使用你自己生成的网站！");
});`
  };

  // ---------- Tabs ----------
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.getElementById("panel-" + tab.dataset.panel);
      if (panel) panel.classList.add("active");
    });
  });

  // ---------- Build full HTML document ----------
  function buildDocument() {
    let html = htmlCode.value.trim() || DEFAULTS.html;
    const css = cssCode.value.trim();
    const js = jsCode.value.trim();

    // If user provided a full HTML document, inject CSS/JS into it
    const hasDoctype = /^\s*<!DOCTYPE/i.test(html) || /^\s*<html/i.test(html);

    if (hasDoctype) {
      // Inject <style> before </head> or at beginning of body
      if (css) {
        if (/<\/head>/i.test(html)) {
          html = html.replace(/<\/head>/i, `  <style>\n${css}\n  </style>\n</head>`);
        } else {
          html = html.replace(/<body[^>]*>/i, (m) => `${m}\n<style>\n${css}\n</style>`);
        }
      }
      // Inject <script> before </body>
      if (js) {
        if (/<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, `  <script>\n${js}\n  </script>\n</body>`);
        } else {
          html += `\n<script>\n${js}\n</script>`;
        }
      }
      return html;
    }

    // Otherwise treat the HTML field as body content
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的网站</title>
  <style>
${css || "/* no styles */"}
  </style>
</head>
<body>
${html}
  <script>
${js || "// no script"}
  </script>
</body>
</html>`;
  }

  // ---------- Update preview ----------
  function updatePreview() {
    const doc = buildDocument();
    // Use srcdoc for simplicity and isolation
    preview.srcdoc = doc;
  }

  function schedulePreview() {
    if (!autoRun.checked) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePreview, DEBOUNCE_MS);
  }

  // Listen for code changes
  [htmlCode, cssCode, jsCode].forEach((el) => {
    el.addEventListener("input", schedulePreview);
  });

  document.getElementById("btn-refresh").addEventListener("click", updatePreview);

  // ---------- Download as clean ZIP ----------
  async function downloadZip() {
    if (typeof JSZip === "undefined" || typeof saveAs === "undefined") {
      alert("ZIP 库尚未加载完成，请稍后再试。");
      return;
    }

    const zip = new JSZip();

    // Produce clean separate files – NO reference to CodeToSite or this tool
    let htmlContent = htmlCode.value.trim() || DEFAULTS.html;
    const cssContent = cssCode.value.trim();
    const jsContent = jsCode.value.trim();

    const hasDoctype = /^\s*<!DOCTYPE/i.test(htmlContent) || /^\s*<html/i.test(htmlContent);

    if (hasDoctype) {
      // User already has full document – still inject external files if they provided CSS/JS
      // Better: export as separate files and link them
      // We rewrite the document to link external style.css and script.js
      let finalHtml = htmlContent;

      // Remove any existing inline style/script we might have injected previously is hard,
      // so we prefer: always export three clean files and link them.
      // Reconstruct a clean HTML that links the files.
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : "我的网站";

      // Extract body content roughly
      let bodyContent = htmlContent;
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        bodyContent = bodyMatch[1]
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .trim();
      }

      finalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${bodyContent}
  <script src="script.js"></script>
</body>
</html>`;

      zip.file("index.html", finalHtml);
      zip.file("style.css", cssContent || "/* styles */");
      zip.file("script.js", jsContent || "// scripts");
    } else {
      // Simple body content
      const finalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的网站</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${htmlContent}
  <script src="script.js"></script>
</body>
</html>`;

      zip.file("index.html", finalHtml);
      zip.file("style.css", cssContent || "/* styles */");
      zip.file("script.js", jsContent || "// scripts");
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "website.zip");
  }

  document.getElementById("btn-download").addEventListener("click", downloadZip);

  // ---------- Open in new tab ----------
  document.getElementById("btn-newtab").addEventListener("click", () => {
    const doc = buildDocument();
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Revoke later
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  // ---------- Reset ----------
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("确定要清空所有代码并恢复默认示例吗？")) return;
    htmlCode.value = DEFAULTS.html;
    cssCode.value = DEFAULTS.css;
    jsCode.value = DEFAULTS.js;
    fileList.innerHTML = "";
    updatePreview();
  });

  // ---------- File Upload ----------
  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      const name = file.name.toLowerCase();
      const reader = new FileReader();

      if (name.endsWith(".zip")) {
        reader.onload = async (e) => {
          try {
            const zip = await JSZip.loadAsync(e.target.result);
            const promises = [];
            zip.forEach((relativePath, zipEntry) => {
              if (zipEntry.dir) return;
              const lower = relativePath.toLowerCase();
              promises.push(
                zipEntry.async("string").then((content) => {
                  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
                    htmlCode.value = content;
                  } else if (lower.endsWith(".css")) {
                    cssCode.value = content;
                  } else if (lower.endsWith(".js")) {
                    jsCode.value = content;
                  }
                })
              );
            });
            await Promise.all(promises);
            addFileChip(file.name);
            updatePreview();
          } catch (err) {
            alert("无法解析 ZIP 文件：" + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (e) => {
          const content = e.target.result;
          if (name.endsWith(".html") || name.endsWith(".htm")) {
            htmlCode.value = content;
          } else if (name.endsWith(".css")) {
            cssCode.value = content;
          } else if (name.endsWith(".js")) {
            jsCode.value = content;
          } else {
            // Try to guess by content type
            if (file.type.includes("html")) htmlCode.value = content;
            else if (file.type.includes("css")) cssCode.value = content;
            else if (file.type.includes("javascript")) jsCode.value = content;
          }
          addFileChip(file.name);
          updatePreview();
        };
        reader.readAsText(file);
      }
    });
  }

  function addFileChip(name) {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.innerHTML = `${name} <span class="remove" title="移除显示">×</span>`;
    chip.querySelector(".remove").addEventListener("click", () => chip.remove());
    fileList.appendChild(chip);
  }

  // Drag & drop
  ["dragenter", "dragover"].forEach((evt) => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove("dragover");
    });
  });

  uploadZone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleFiles(files);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
    fileInput.value = ""; // allow re-upload same file
  });

  // ---------- Init ----------
  function init() {
    htmlCode.value = DEFAULTS.html;
    cssCode.value = DEFAULTS.css;
    jsCode.value = DEFAULTS.js;
    updatePreview();
  }

  // Wait for deferred scripts if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
