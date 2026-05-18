function chunkText(text, chunkSize = 500) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

// ── Inject code into Monaco Editor (LeetCode) ────────────────────────────────

function injectIntoMonaco(code) {
  // Strategy 1: Monaco global API
  try {
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      if (models.length > 0) {
        models[0].setValue(code);
        return { ok: true, strategy: 'monaco-api' };
      }
    }
  } catch (_) {}

  // Strategy 2: execCommand via hidden textarea Monaco uses internally
  try {
    const textarea = document.querySelector('.monaco-editor textarea');
    if (textarea) {
      textarea.focus();
      document.execCommand('selectAll');
      const success = document.execCommand('insertText', false, code);
      if (success) return { ok: true, strategy: 'execCommand' };
    }
  } catch (_) {}

  // Strategy 3: Walk React fiber tree to find editor.setValue
  try {
    const editorEl = document.querySelector('.monaco-editor');
    if (editorEl) {
      const fiberKey = Object.keys(editorEl).find(k =>
        k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
      );
      if (fiberKey) {
        let fiber = editorEl[fiberKey];
        let depth = 0;
        while (fiber && depth < 200) {
          const si = fiber.stateNode;
          if (si && si.editor && typeof si.editor.setValue === 'function') {
            si.editor.setValue(code);
            return { ok: true, strategy: 'react-fiber' };
          }
          fiber = fiber.return;
          depth++;
        }
      }
    }
  } catch (_) {}

  return { ok: false, error: 'Could not find Monaco editor on this page.' };
}

// ── Scrape LeetCode problem ───────────────────────────────────────────────────

function getLeetCodeData() {
  const titleEl   = document.querySelector('[data-cy="question-title"], .text-title-large a, h1');
  const title     = titleEl ? titleEl.textContent.trim() : document.title.trim();

  const descEl    = document.querySelector('[data-track-load="description_content"], .elfjS, .question-content__JfgR');
  const description = descEl ? descEl.innerText.trim() : '';

  const langBtn   = document.querySelector('button[data-cy="lang-btn"], .ant-select-selection-item');
  const language  = langBtn ? langBtn.textContent.trim() : 'Python3';

  // Current code in editor (gives LLM the function signature to fill in)
  let currentCode = '';
  try {
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      if (models.length > 0) currentCode = models[0].getValue();
    }
  } catch (_) {}
  if (!currentCode) {
    const ta = document.querySelector('.monaco-editor textarea');
    currentCode = ta ? ta.value : '';
  }

  return { title, description, language, currentCode };
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === 'GET_PAGE_DATA') {
    const rawText     = document.body.innerText;
    const cleanedText = rawText.replace(/[\n\t]+/g, ' ').trim();
    sendResponse({ chunks: chunkText(cleanedText || '') });
  }

  if (message.type === 'GET_LEETCODE_DATA') {
    sendResponse(getLeetCodeData());
  }

  if (message.type === 'INJECT_CODE') {
    sendResponse(injectIntoMonaco(message.code));
  }

  return true;
});


// ================= FLOATING WIDGET =================

if (!document.getElementById("smartassist-widget")) {

  const widget = document.createElement("div");
  widget.id = "smartassist-widget";

  widget.innerHTML = `
    <div id="smartassist-button">Ask AI</div>

    <div id="smartassist-panel" class="hidden">
    <div id="smartassist-header">
    <span>SmAs.AI</span>
  
    <div id="smartassist-actions">
      <button id="theme-toggle">🌙</button>
      <button id="smartassist-close">×</button>
    </div>
  </div>

      <iframe src="${chrome.runtime.getURL("popup/popup.html")}"></iframe>
    </div>
  `;

  document.body.appendChild(widget);

  // ---------- Styles ----------
  const style = document.createElement("style");

  style.textContent = `
    #smartassist-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: sans-serif;
    }

    #smartassist-button {
      width: 90px;
      height: 50px;
    
      border-radius: 999px;
    
      background: linear-gradient(135deg, #6C63FF, #7F53FF, #9B5CFF);
    
      color: white;
    
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    
      cursor: grab;
    
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.2px;
    
      user-select: none;
    
      box-shadow:
        0 10px 30px rgba(108, 99, 255, 0.45),
        0 0 18px rgba(155, 92, 255, 0.35);
    
      transition:
        transform 0.2s ease,
        box-shadow 0.25s ease;
    
      padding: 0 18px;
    }


    #smartassist-button:hover {
      transform: scale(1.08);
    
      box-shadow:
        0 14px 40px rgba(108, 99, 255, 0.6),
        0 0 28px rgba(155, 92, 255, 0.5);
    }

    #smartassist-panel {
      width: 500px;
      height: 600px;
      background: white;
      border-radius: 18px;
      overflow: hidden;
      position: absolute;
      bottom: 80px;
      right: 0;
      box-shadow: 0 10px 40px rgba(0,0,0,0.25);
    }

    #smartassist-panel.hidden {
      display: none;
    }

    #smartassist-header {
      height: 52px;
      background: linear-gradient(
        135deg,
        #6C63FF,
        #7F53FF,
        #9B5CFF
      );
    
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 10px 10px;
    }

    #smartassist-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    #smartassist-header button {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
    
      width: 32px;
      height: 32px;
    
      border-radius: 50%;
    
      font-size: 18px;
      cursor: pointer;
    
      transition: 0.2s ease;
    }
    
    #smartassist-header button:hover {
      background: rgba(255,255,255,0.25);
      transform: scale(1.08);
    }

    #smartassist-panel iframe {
      width: 100%;
      height: calc(100% - 52px);
      border: none;
    }
  `;

  document.head.appendChild(style);

  const button = document.getElementById("smartassist-button");
  const panel = document.getElementById("smartassist-panel");
  const closeBtn = document.getElementById("smartassist-close");

  const themeToggle = document.getElementById("theme-toggle");

  let darkMode = false;
  
  themeToggle.addEventListener("click", () => {
  
    darkMode = !darkMode;
  
    const iframe = document.querySelector("#smartassist-panel iframe");
  
    if (darkMode) {
  
      panel.style.background = "#111827";
      panel.style.color = "white";
  
      document.getElementById("smartassist-header").style.background =
        "linear-gradient(135deg, #111827, #1f2937)";
  
      iframe.style.filter = "invert(1) hue-rotate(180deg)";
  
      themeToggle.textContent = "☀️";
  
    } else {
  
      panel.style.background = "white";
      panel.style.color = "black";
  
      document.getElementById("smartassist-header").style.background =
        "linear-gradient(135deg, #6C63FF, #7F53FF, #9B5CFF)";
  
      iframe.style.filter = "none";
  
      themeToggle.textContent = "🌙";
    }
  });

  // ---------- Open / Close ----------
  button.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.add("hidden");
  });

  document.addEventListener("click", (e) => {

    const clickedInsideWidget = widget.contains(e.target);
  
    // If click is outside widget → close panel
    if (!clickedInsideWidget) {
      panel.classList.add("hidden");
    }
  });

  // ---------- Dragging ----------
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  button.addEventListener("mousedown", (e) => {
    isDragging = true;

    offsetX = e.clientX - widget.offsetLeft;
    offsetY = e.clientY - widget.offsetTop;

    button.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    widget.style.left = `${e.clientX - offsetX}px`;
    widget.style.top = `${e.clientY - offsetY}px`;

    widget.style.right = "auto";
    widget.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    button.style.cursor = "grab";
  });
}