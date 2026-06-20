chrome.runtime.onInstalled.addListener(() => {
  console.log("SmAs-AI Installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ==========================
  // NORMAL CHAT
  // ==========================
  if (message.type === "CHAT_QUERY") {

    fetch("https://smas-ai-mk3u.onrender.com/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: message.payload.question
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({
        answer: data.answer || "No response"
      });
    })
    .catch(err => {
      console.error(err);
      sendResponse({ error: true });
    });

    return true;
  }

  // ==========================
  // RAG QUERY
  // ==========================
  if (message.type === "RAG_QUERY") {

    fetch("https://smas-ai-mk3u.onrender.com/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: message.payload.question,
        top_k: 5
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({
        answer: data.answer || "No response"
      });
    })
    .catch(err => {
      console.error(err);
      sendResponse({ error: true });
    });

    return true;
  }

  // ==========================
  // CODE QUERY
  // ==========================
  if (message.type === "CODE_QUERY") {

    fetch("https://smas-ai-mk3u.onrender.com/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question:
          "Answer as a coding assistant:\n" +
          message.payload.question
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({
        answer: data.answer || "No response"
      });
    })
    .catch(err => {
      console.error(err);
      sendResponse({ error: true });
    });

    return true;
  }

  // ==========================
  // INGEST PAGE
  // ==========================
  if (message.type === "RAG_INGEST") {

    fetch("https://smas-ai-mk3u.onrender.com/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.payload)
    })
    .then(res => res.json())
    .then(data => {
      sendResponse(data);
    })
    .catch(err => {
      console.error(err);
      sendResponse({ error: true });
    });

    return true;
  }

});