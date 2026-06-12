// BridgeMind Extension Background Service Worker

// Keep track of connection status and logs
console.log("BridgeMind Background worker active.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "adaptPage") {
    console.log("Starting page adaptation request via backend...");
    
    // We send a request to the local FastAPI backend.
    // Ensure the backend port matches main.py (8000)
    fetch("http://127.0.0.1:8000/api/adapt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: request.content,
        page_type: request.pageType || "general",
        profile: request.profile || "custom",
        agents: request.agents || ["reader", "focus", "comprehension", "communication", "emotion"],
        options: request.options || { focus_level: 2, reading_level: "standard" }
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Backend server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Successfully adapted content from backend.");
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      console.error("BridgeMind API error:", error);
      sendResponse({ 
        success: false, 
        error: error.message || "Could not connect to BridgeMind server. Make sure your backend API is running at http://127.0.0.1:8000."
      });
    });
    
    return true; // Keep message channel open for async response
  }
  
  // Handlers for storage helper, or caching if needed
  if (request.action === "getProfiles") {
    fetch("http://127.0.0.1:8000/api/profiles")
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "chatQuery") {
    fetch("http://127.0.0.1:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: request.content,
        query: request.query,
        profile: request.profile || "custom"
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("Server error");
      return res.json();
    })
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "simplifyQuery") {
    fetch("http://127.0.0.1:8000/api/simplify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: request.text,
        mode: request.mode,
        profile: request.profile || "custom"
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("Server error");
      return res.json();
    })
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

