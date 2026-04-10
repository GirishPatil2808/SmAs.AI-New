chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "ASK_AI") {
  
      fetch("https://chrome-rag-extension.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: message.query
        })
      })
      .then(res => res.json())
      .then(data => {
        sendResponse({ answer: data.answer || "No response" });
      })
      .catch(err => {
        sendResponse({ answer: "Error: " + err.message });
      });
  
      return true;
    }
  });