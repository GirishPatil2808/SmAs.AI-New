chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "ASK_AI") {

    const mode = message.mode || "rag"; // rag | chat | code
    const endpointMap = {
      rag: "rag",
      chat: "chat",
      code: "code"
    };

    const endpoint = endpointMap[mode];

    fetch(`https://chrome-rag-extension.onrender.com/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: message.query,
        chunks: message.pageText ? [message.pageText] : [],
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({ answer: data.answer || data.text || "No response" });
    })
    .catch(err => {
      sendResponse({ answer: "Error: " + err.message });
    });

    return true;
  }
});