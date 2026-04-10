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

// ── FLOATING WIDGET UI ─────────────────────────────────────────────

(function initSmAsWidget() {
  if (document.querySelector('#smas-widget')) return;

  // Floating button
  const button = document.createElement("div");
  button.id = "smas-widget";
  button.innerHTML = "Ask AI";

  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "90px",
    height: "40px",
    background: "#000",              // black
    color: "#4CAF50",               // green text
    borderRadius: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "14px",
    cursor: "pointer",
    zIndex: "999999",
    border: "1px solid #4CAF50",    // green border
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
  });

  document.body.appendChild(button);

  document.addEventListener("click", async (e) => {
    if (e.target.id === "send-btn") {
      const input = document.getElementById("chat-input");
      const msgBox = document.getElementById("chat-messages");
  
      const query = input.value.trim();
      if (!query) return;
  
      // Show user message
      msgBox.innerHTML += `<div style="text-align:right;">${query}</div>`;
      input.value = "";
  
      // Get page data
      const rawText = document.body.innerText;
      const cleanedText = rawText.replace(/[\n\t]+/g, ' ').trim();
  
      // Call backend (same as popup.js)
      const response = await fetch("https://chrome-rag-extension.onrender.com/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": "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",   // ⚠️ IMPORTANT
          "Provider": "openai"
        },
        body: JSON.stringify({
          query: query,
          chunks: [cleanedText]
        })
      });
  
      const data = await response.text();
  
      // Show AI response
      msgBox.innerHTML += `<div style="text-align:left;">🤖 ${data}</div>`;
      msgBox.scrollTop = msgBox.scrollHeight;
    }
  });

  // Chat box
  const chatBox = document.createElement("div");
  chatBox.id = "smas-chat";

  Object.assign(chatBox.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "340px",
    height: "450px",
    background: "#111",              // dark background
    border: "1px solid #333",
    borderRadius: "12px",
    display: "none",
    flexDirection: "column",
    zIndex: "999999",
    boxShadow: "0 8px 25px rgba(0,0,0,0.6)",
    color: "#fff"
  });

  chatBox.innerHTML = `
  <div style="padding:12px; background:#000; color:#4CAF50; font-weight:bold;">
    Ask AI
  </div>

  <div id="chat-messages" style="flex:1; padding:10px; overflow:auto;"></div>

  <div style="display:flex;">
  <input id="chat-input" placeholder="Ask AI..." 
    style="flex:1; padding:10px; border:none;" />
  <button id="send-btn" style="padding:10px; background:#4CAF50; color:#fff; border:none;">
    Ask
  </button>
</div>
`;

  document.body.appendChild(chatBox);

  // Toggle
  button.onclick = () => {
    chatBox.style.display =
      chatBox.style.display === "none" ? "flex" : "none";
  };

  const input = document.getElementById("chat-input");
const messagesDiv = document.getElementById("chat-messages");

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && input.value.trim()) {

    const query = input.value.trim();

    messagesDiv.innerHTML += `<div><b>You:</b> ${query}</div>`;
    input.value = "";

    chrome.runtime.sendMessage(
      { 
        type: "ASK_AI",//https://leetcode.com/problemset/
        query: query,
        mode: "rag", // later we can switch modes
        pageText: document.body.innerText
      },
    );
  }
});

})();