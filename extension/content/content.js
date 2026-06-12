// BridgeMind Extension Content Script

console.log("BridgeMind Content script loaded.");

// Global state to store original page styles if we need to undo
let originalBodyStyles = {};
let originalDisplayStyles = new Map();
let overlayElement = null;

// Listen for messages from the popup or background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractPageContent") {
    const textData = extractReadableContent();
    sendResponse(textData);
  }
  
  else if (request.action === "injectAdaptation") {
    try {
      applyAdaptation(request.data, request.profile);
      sendResponse({ success: true });
    } catch (e) {
      console.error("Failed to apply BridgeMind adaptation:", e);
      sendResponse({ success: false, error: e.message });
    }
  }
  
  else if (request.action === "removeAdaptation") {
    removeAdaptation();
    sendResponse({ success: true });
  }
});

/**
 * Extracts clean readable text from the webpage.
 */
function extractReadableContent() {
  // Determine page type
  let pageType = "general";
  const bodyText = document.body.innerText.toLowerCase();
  
  const forms = document.querySelectorAll("form");
  const inputs = document.querySelectorAll("input, textarea, select");
  if (forms.length > 0 && inputs.length > 5) {
    pageType = "form";
  } else if (
    bodyText.includes("assignment") || 
    bodyText.includes("homework") || 
    bodyText.includes("due date") || 
    bodyText.includes("rubric") || 
    bodyText.includes("submit your")
  ) {
    pageType = "assignment";
  } else if (document.querySelector("article") || document.querySelectorAll("p").length > 5) {
    pageType = "article";
  }

  // Extract core readable text
  // We prefer reading from <article> or main containers to avoid header/footer noise.
  let contentText = "";
  const mainContainers = document.querySelectorAll("article, [role='main'], main, .post-content, .article-content, #content");
  
  if (mainContainers.length > 0) {
    mainContainers.forEach(container => {
      contentText += container.innerText + "\n";
    });
  }
  
  // If no main container found, extract from headings and paragraphs
  if (contentText.trim().length < 200) {
    contentText = "";
    const tags = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li");
    tags.forEach(tag => {
      // Avoid extracting navigation or footer items
      const parent = tag.parentElement;
      const isNoise = parent && (
        parent.tagName === "NAV" || 
        parent.tagName === "FOOTER" || 
        parent.tagName === "HEADER" ||
        parent.className.toLowerCase().includes("nav") ||
        parent.className.toLowerCase().includes("menu") ||
        parent.className.toLowerCase().includes("footer")
      );
      if (!isNoise) {
        contentText += tag.innerText + "\n";
      }
    });
  }

  // If still too short, fall back to entire body text
  if (contentText.trim().length < 100) {
    contentText = document.body.innerText;
  }

  return {
    content: contentText.substring(0, 50000), // Cap at 50k chars
    pageType: pageType
  };
}

/**
 * Injects the accessibility overlay and hides distractions.
 */
function applyAdaptation(data, profile) {
  // Remove existing overlay first
  removeAdaptation();

  // 1. Focus Agent: Hide distraction elements
  if (data.focus_output && data.focus_output.remove_selectors) {
    data.focus_output.remove_selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Store original display style
          if (!originalDisplayStyles.has(el)) {
            originalDisplayStyles.set(el, el.style.display);
          }
          el.style.display = "none";
        });
      } catch (err) {
        // Ignore invalid selectors
      }
    });
  }

  // 2. Focus Agent: Inject custom styling rules
  if (data.focus_output && data.focus_output.inject_css) {
    const styleEl = document.createElement("style");
    styleEl.id = "bridgemind-focus-styles";
    styleEl.textContent = data.focus_output.inject_css;
    document.head.appendChild(styleEl);
  }

  // 3. Mount Reader Overlay (ADHD, Dyslexia, Autism, Custom)
  overlayElement = document.createElement("div");
  overlayElement.id = "bridgemind-overlay";
  overlayElement.className = `theme-cream font-sans`; // Default theme
  
  // Set default fonts/classes depending on profile
  if (profile === "dyslexia") {
    overlayElement.className = "theme-sepia font-dyslexic spacing-dyslexic";
  } else if (profile === "adhd") {
    overlayElement.className = "theme-cream font-sans spacing-adhd";
  } else if (profile === "autism") {
    overlayElement.className = "theme-high-contrast font-sans spacing-autism";
  }

  // Compile individual agent views
  let emotionWarningHtml = "";
  if (data.emotion_output && data.emotion_output.distress_detected) {
    emotionWarningHtml = `
      <div class="bm-warning-banner">
        <div class="bm-warning-icon">⚠️</div>
        <div class="bm-warning-body">
          <strong>Content Warning:</strong> ${data.emotion_output.warning_message || "Sensitive content detected. Take care while reading."}
        </div>
      </div>
    `;
  }

  let communicationStepsHtml = "";
  if (data.communication_output && data.communication_output.steps && data.communication_output.steps.length > 0) {
    const stepsItems = data.communication_output.steps
      .map(step => `<li><span class="bm-step-bullet">✓</span><span class="bm-step-text">${escapeHtml(step)}</span></li>`)
      .join("");
      
    communicationStepsHtml = `
      <div class="bm-card bm-card-communication">
        <h3 class="bm-card-title">📋 Step-by-Step Instructions</h3>
        <ol class="bm-steps-list">
          ${stepsItems}
        </ol>
      </div>
    `;
  }

  let comprehensionHtml = "";
  if (data.comprehension_output) {
    const tldrItems = data.comprehension_output.tldr
      .map(bullet => `<li>${escapeHtml(bullet)}</li>`)
      .join("");

    comprehensionHtml = `
      <div class="bm-card bm-card-comprehension">
        <h3 class="bm-card-title">💡 Quick TL;DR Summary</h3>
        <ul class="bm-tldr-list">
          ${tldrItems}
        </ul>
        
        <div class="bm-summary-toggle-container">
          <div class="bm-tabs">
            <button class="bm-tab active" id="btn-tab-simple">Simple Version</button>
            <button class="bm-tab" id="btn-tab-detailed">Detailed Version</button>
          </div>
          <div class="bm-tab-content" id="bm-summary-content">
            ${escapeHtml(data.comprehension_output.simple_version)}
          </div>
        </div>
      </div>
    `;
  }

  let readerHtml = "";
  if (data.reader_output && data.reader_output.structured_text) {
    // Basic Markdown Parser for headings, paragraphs, and bolds
    const parsedText = parseSimpleMarkdown(data.reader_output.structured_text);
    readerHtml = `
      <div class="bm-card bm-card-reader">
        <h3 class="bm-card-title">📖 Restructured Reading</h3>
        <div class="bm-reader-body">
          ${parsedText}
        </div>
      </div>
    `;
  } else {
    // Fallback if reader agent didn't run but we need text
    const textData = extractReadableContent();
    readerHtml = `
      <div class="bm-card bm-card-reader">
        <h3 class="bm-card-title">📖 Restructured Reading</h3>
        <div class="bm-reader-body">
          <p>${escapeHtml(textData.content).replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    `;
  }

  // Assemble Concept Map Drawer
  let conceptMapHtml = "";
  if (data.comprehension_output && data.comprehension_output.concept_map) {
    conceptMapHtml = `
      <div class="bm-cmap-drawer hidden" id="bm-cmap-drawer">
        <div class="bm-cmap-header">
          <h3>Visual Concept Map</h3>
          <button class="bm-cmap-close" id="btn-close-cmap">&times;</button>
        </div>
        <div class="bm-cmap-canvas" style="flex: 1; display: block; padding: 15px;">
          <div style="font-size:12px; opacity:0.7; margin-bottom:8px; text-align:center;">💡 Drag concepts to organize, or double-click to simplify.</div>
          <div class="bm-svg-cmap-canvas" id="bm-svg-canvas">
            <svg class="bm-svg-connections-layer" id="bm-svg-connections"></svg>
            <!-- Draggable nodes will be injected dynamically in setupOverlayEvents -->
          </div>
        </div>
      </div>
    `;
  }

  // Set inner HTML of overlay
  overlayElement.innerHTML = `
    <!-- Top Nav Bar -->
    <div class="bm-top-bar">
      <div class="bm-nav-brand">
        <span class="bm-logo-dot"></span>
        <span class="bm-brand-text">BridgeMind Active</span>
        <span class="bm-profile-badge">${profile.toUpperCase()} Mode</span>
      </div>
      
      <div class="bm-controls">
        <!-- Font family toggle -->
        <button class="bm-nav-btn" id="btn-toggle-font" title="Toggle Dyslexic Font">Dyslexia Font</button>
        
        <!-- Focus Ruler Toggle -->
        <button class="bm-nav-btn" id="btn-toggle-ruler" title="Toggle Focus Ruler">Focus Ruler</button>

        <!-- Theme Selectors -->
        <div class="bm-themes">
          <button class="bm-theme-btn cream active" data-theme="cream" title="Cream Theme"></button>
          <button class="bm-theme-btn sepia" data-theme="sepia" title="Sepia Theme"></button>
          <button class="bm-theme-btn dark" data-theme="dark" title="Dark Theme"></button>
          <button class="bm-theme-btn high-contrast" data-theme="high-contrast" title="High Contrast Theme"></button>
        </div>

        <!-- Feedback buttons -->
        <div class="bm-feedback-controls" style="display: flex; align-items: center; gap: 6px; border-left: 1px solid rgba(120, 120, 120, 0.2); padding-left: 12px; margin-left: 6px;">
          <span style="font-size:11px; opacity:0.7;">Helpful?</span>
          <button class="bm-nav-btn" id="btn-feedback-up" title="This was helpful" style="padding: 4px 8px; font-size:12px; line-height: 1;">👍</button>
          <button class="bm-nav-btn" id="btn-feedback-down" title="This wasn't helpful" style="padding: 4px 8px; font-size:12px; line-height: 1;">👎</button>
        </div>

        <!-- Undo Button -->
        <button class="bm-btn-close" id="btn-close-bm">Restore Original</button>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="bm-content-wrapper">
      <div class="bm-reading-ruler hidden" id="bm-reading-ruler"></div>
      <div class="bm-main-layout">
        ${emotionWarningHtml}
        ${communicationStepsHtml}
        ${comprehensionHtml}
        ${readerHtml}
      </div>
    </div>

    <!-- Concept Map Trigger Button -->
    ${data.comprehension_output ? `
      <button class="bm-cmap-trigger-btn" id="btn-trigger-cmap">
        <span class="cmap-icon">🕸️</span> Map
      </button>
    ` : ""}

    <!-- Chat Trigger Button -->
    <button class="bm-ask-trigger-btn" id="btn-trigger-chat">
      <span class="chat-icon">💬</span> Ask AI
    </button>

    <!-- Concept Map Drawer -->
    ${conceptMapHtml}

    <!-- Chat Sidebar -->
    <div class="bm-chat-sidebar hidden" id="bm-chat-sidebar">
      <div class="bm-chat-resizer" id="bm-chat-resizer"></div>
      <div class="bm-chat-header">
        <h3>Ask BridgeMind AI</h3>
        <button class="bm-chat-close" id="btn-close-chat">&times;</button>
      </div>
      <div class="bm-chat-messages" id="bm-chat-messages">
        <div class="bm-message bm-message-ai">
          Hi! I am your BridgeMind learning companion. Ask me any question about this webpage!
        </div>
      </div>
      <div class="bm-chat-input-container">
        <input type="text" class="bm-chat-input" id="bm-chat-input" placeholder="Type a question...">
        <button class="bm-chat-send-btn" id="btn-send-chat">Send</button>
      </div>
    </div>
  `;


  // Prepend to body
  document.body.appendChild(overlayElement);
  
  // Prevent original page scrolling, use overlay scrolling instead
  originalBodyStyles.overflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // Increment page adapted count in Chrome storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["adaptedCount"], (settings) => {
      const count = (settings.adaptedCount || 0) + 1;
      chrome.storage.local.set({ adaptedCount: count });
    });
  }

  // Wire up event listeners inside the overlay
  setupOverlayEvents(data, profile);
}

/**
 * Hook event listeners to the newly created overlay controls.
 */
function setupOverlayEvents(data, profile) {
  // Close / Restore
  document.getElementById("btn-close-bm").addEventListener("click", () => {
    removeAdaptation();
  });

  // Feedback Buttons
  const btnFeedbackUp = document.getElementById("btn-feedback-up");
  const btnFeedbackDown = document.getElementById("btn-feedback-down");
  
  if (btnFeedbackUp && btnFeedbackDown) {
    btnFeedbackUp.addEventListener("click", () => {
      chrome.storage.local.get(["thumbsUpCount"], (settings) => {
        const count = (settings.thumbsUpCount || 0) + 1;
        chrome.storage.local.set({ thumbsUpCount: count }, () => {
          disableFeedbackButtons("Thanks! 👍");
        });
      });
    });
    
    btnFeedbackDown.addEventListener("click", () => {
      chrome.storage.local.get(["thumbsDownCount"], (settings) => {
        const count = (settings.thumbsDownCount || 0) + 1;
        chrome.storage.local.set({ thumbsDownCount: count }, () => {
          disableFeedbackButtons("Recorded! 👎");
        });
      });
    });
    
    function disableFeedbackButtons(message) {
      const parent = btnFeedbackUp.parentElement;
      if (parent) {
        parent.innerHTML = `<span style="font-size:11px; color:#10b981; font-weight:600; animation:fade-in 0.2s;">${message}</span>`;
      }
    }
  }

  // Theme Switches
  const themeBtns = overlayElement.querySelectorAll(".bm-theme-btn");
  themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      themeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const themeName = btn.getAttribute("data-theme");
      // Keep other classes (font/spacing)
      const currentClasses = Array.from(overlayElement.classList);
      const cleanedClasses = currentClasses.filter(c => !c.startsWith("theme-"));
      overlayElement.className = `${cleanedClasses.join(" ")} theme-${themeName}`;
    });
  });



  // Dyslexia Font Toggle
  document.getElementById("btn-toggle-font").addEventListener("click", () => {
    overlayElement.classList.toggle("font-dyslexic");
    overlayElement.classList.toggle("spacing-dyslexic");
  });

  // Focus Ruler Toggle & Mouse Tracking
  const btnToggleRuler = document.getElementById("btn-toggle-ruler");
  const rulerEl = document.getElementById("bm-reading-ruler");
  let isRulerActive = false;

  btnToggleRuler.addEventListener("click", () => {
    isRulerActive = !isRulerActive;
    btnToggleRuler.classList.toggle("active", isRulerActive);
    rulerEl.classList.toggle("hidden", !isRulerActive);
  });

  contentWrapper.addEventListener("mousemove", (e) => {
    if (!isRulerActive) return;
    const rect = contentWrapper.getBoundingClientRect();
    const top = e.clientY - rect.top + contentWrapper.scrollTop - 20; // 20px offset (ruler is 40px high)
    rulerEl.style.transform = `translateY(${top}px)`;
  });

  // Wire TTS controls for initial text blocks
  const readableElements = overlayElement.querySelectorAll(".bm-reader-body p, .bm-reader-body h2, .bm-reader-body h3, .bm-reader-body h4, .bm-tldr-list li, #bm-summary-content");
  readableElements.forEach(wireTTSElement);

  // Summary Toggle Tabs
  if (data.comprehension_output) {
    const tabSimple = document.getElementById("btn-tab-simple");
    const tabDetailed = document.getElementById("btn-tab-detailed");
    const summaryContent = document.getElementById("bm-summary-content");

    // Add speaker button to the initial tab content
    wireTTSElement(summaryContent);

    tabSimple.addEventListener("click", () => {
      tabSimple.classList.add("active");
      tabDetailed.classList.remove("active");
      summaryContent.innerHTML = escapeHtml(data.comprehension_output.simple_version);
      wireTTSElement(summaryContent);
    });

    tabDetailed.addEventListener("click", () => {
      tabDetailed.classList.add("active");
      tabSimple.classList.remove("active");
      summaryContent.innerHTML = escapeHtml(data.comprehension_output.detailed_version);
      wireTTSElement(summaryContent);
    });

    // Concept Map Drawer triggers
    const cmapTrigger = document.getElementById("btn-trigger-cmap");
    const cmapDrawer = document.getElementById("bm-cmap-drawer");
    const cmapClose = document.getElementById("btn-close-cmap");

    if (cmapTrigger && cmapDrawer && cmapClose) {
      cmapTrigger.addEventListener("click", () => {
        cmapDrawer.classList.toggle("hidden");
      });
      cmapClose.addEventListener("click", () => {
        cmapDrawer.classList.add("hidden");
      });
    }

    // Setup Drag and Drop SVG Concept Map
    if (data.comprehension_output.concept_map) {
      setupConceptMap(data.comprehension_output.concept_map, profile);
    }
  }

  // Ask BridgeMind Sidebar Events
  const btnTriggerChat = document.getElementById("btn-trigger-chat");
  const chatSidebar = document.getElementById("bm-chat-sidebar");
  const btnCloseChat = document.getElementById("btn-close-chat");
  const btnSendChat = document.getElementById("btn-send-chat");
  const chatInput = document.getElementById("bm-chat-input");
  const chatMessages = document.getElementById("bm-chat-messages");
  const chatResizer = document.getElementById("bm-chat-resizer");

  btnTriggerChat.addEventListener("click", () => {
    chatSidebar.classList.toggle("hidden");
    if (!chatSidebar.classList.contains("hidden")) {
      chatInput.focus();
    }
  });

  btnCloseChat.addEventListener("click", () => {
    chatSidebar.classList.add("hidden");
  });

  // Handle sidebar dragging to resize its width
  let isResizing = false;
  chatResizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    chatResizer.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    // Bounds check: minimum 360px wide, maximum 85vw or 900px
    if (newWidth >= 360 && newWidth <= Math.min(window.innerWidth * 0.85, 900)) {
      chatSidebar.style.width = `${newWidth}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      chatResizer.classList.remove("dragging");
      document.body.style.cursor = "default";
    }
  });


  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    appendChatMessage("user", text);
    chatInput.value = "";
    
    const pageData = extractReadableContent();
    const loadingEl = appendChatMessage("ai", "Thinking...");
    
    chrome.runtime.sendMessage({
      action: "chatQuery",
      content: pageData.content,
      query: text,
      profile: profile
    }, (response) => {
      if (loadingEl) loadingEl.remove();
      if (response && response.success && response.data) {
        appendChatMessage("ai", response.data.response);
      } else {
        const err = (response && response.error) ? response.error : "Failed to connect to backend.";
        appendChatMessage("ai", `Error: ${err}`);
      }
    });
  }

  function appendChatMessage(sender, text) {
    const msgEl = document.createElement("div");
    msgEl.className = `bm-message bm-message-${sender}`;
    if (sender === "ai") {
      msgEl.innerHTML = parseSimpleMarkdown(text);
      // Wire TTS to new AI responses!
      wireTTSElement(msgEl);
    } else {
      msgEl.textContent = text;
    }
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgEl;
  }

  btnSendChat.addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });

  // Text selection dictionary tooltip events
  let activeTooltip = null;
  contentWrapper.addEventListener("mouseup", (e) => {
    if (activeTooltip && !activeTooltip.contains(e.target)) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0 && selectedText.length < 300) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;
      const rect = rects[0];
      
      activeTooltip = document.createElement("div");
      activeTooltip.className = "bm-selection-tooltip";
      activeTooltip.innerHTML = `
        <button class="bm-tooltip-btn" id="bm-btn-define">📖 Define</button>
        <button class="bm-tooltip-btn" id="bm-btn-simplify">💡 Simplify</button>
      `;
      
      // Position tooltip slightly above selection
      activeTooltip.style.left = `${rect.left + window.scrollX + rect.width / 2 - 70}px`;
      activeTooltip.style.top = `${rect.top + window.scrollY - 45}px`;
      
      document.body.appendChild(activeTooltip);
      
      activeTooltip.querySelector("#bm-btn-define").addEventListener("click", () => {
        triggerSimplifySelection(selectedText, "define", range, profile);
        activeTooltip.remove();
        activeTooltip = null;
      });
      activeTooltip.querySelector("#bm-btn-simplify").addEventListener("click", () => {
        triggerSimplifySelection(selectedText, "simplify", range, profile);
        activeTooltip.remove();
        activeTooltip = null;
      });
    }
  });
}

/**
 * Renders and wires drag listener coordinates on SVG Concept Maps
 */
function setupConceptMap(cmap, profile) {
  const canvas = document.getElementById("bm-svg-canvas");
  const svg = document.getElementById("bm-svg-connections");
  
  const mainNode = cmap.main;
  const nodes = cmap.nodes;
  
  const allConcepts = [
    { id: "root", name: mainNode, isRoot: true, x: 140, y: 200 }
  ];
  
  nodes.forEach((n, idx) => {
    const angle = (idx * 2 * Math.PI) / nodes.length;
    const r = 140; // radius of orbit
    allConcepts.push({
      id: `node-${idx}`,
      name: n,
      isRoot: false,
      x: Math.round(140 + r * Math.cos(angle)),
      y: Math.round(200 + r * Math.sin(angle))
    });
  });
  
  allConcepts.forEach((c) => {
    const div = document.createElement("div");
    div.className = `bm-svg-node ${c.isRoot ? 'root' : ''}`;
    div.id = `bm-cmap-dom-${c.id}`;
    div.textContent = c.name;
    div.style.left = `${c.x}px`;
    div.style.top = `${c.y}px`;
    canvas.appendChild(div);
    
    // Implement drag and drop
    let isDragging = false;
    let startX, startY;
    
    div.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX - div.offsetLeft;
      startY = e.clientY - div.offsetTop;
      div.style.zIndex = 10;
      e.preventDefault();
    });
    
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      let left = e.clientX - startX;
      let top = e.clientY - startY;
      
      left = Math.max(0, Math.min(canvas.clientWidth - div.clientWidth, left));
      top = Math.max(0, Math.min(canvas.clientHeight - div.clientHeight, top));
      
      div.style.left = `${left}px`;
      div.style.top = `${top}px`;
      
      c.x = left;
      c.y = top;
      
      drawConnections();
    });
    
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        div.style.zIndex = c.isRoot ? 3 : 2;
      }
    });
    
    // Double click node to simplify
    div.addEventListener("dblclick", () => {
      const range = document.createRange();
      range.selectNode(div);
      triggerSimplifySelection(c.name, "simplify", range, profile);
    });
  });
  
  function drawConnections() {
    svg.innerHTML = "";
    const root = allConcepts.find(c => c.isRoot);
    const rootDiv = document.getElementById(`bm-cmap-dom-${root.id}`);
    const rx = root.x + rootDiv.clientWidth / 2;
    const ry = root.y + rootDiv.clientHeight / 2;
    
    allConcepts.forEach((c) => {
      if (c.isRoot) return;
      const childDiv = document.getElementById(`bm-cmap-dom-${c.id}`);
      const cx = c.x + childDiv.clientWidth / 2;
      const cy = c.y + childDiv.clientHeight / 2;
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mx = (rx + cx) / 2;
      const my = (ry + cy) / 2 - 20;
      path.setAttribute("d", `M ${rx} ${ry} Q ${mx} ${my} ${cx} ${cy}`);
      path.setAttribute("class", "bm-svg-connection");
      svg.appendChild(path);
    });
  }
  
  setTimeout(drawConnections, 100);
}

/**
 * Triggers define or simplify API request and puts cards inline
 */
function triggerSimplifySelection(text, mode, range, profile) {
  let containerElement = range.commonAncestorContainer;
  if (containerElement.nodeType === 3) {
    containerElement = containerElement.parentElement;
  }
  const blockEl = containerElement.closest("p, h2, h3, h4, li") || containerElement;
  
  const resultCard = document.createElement("div");
  resultCard.className = "bm-card bm-selection-result-card";
  resultCard.innerHTML = `<div style="font-size: 13px; opacity:0.8;">⏳ Fetching ${mode === 'define' ? 'definition' : 'explanation'} for "${escapeHtml(text)}"...</div>`;
  blockEl.parentNode.insertBefore(resultCard, blockEl.nextSibling);
  
  chrome.runtime.sendMessage({
    action: "simplifyQuery",
    text: text,
    mode: mode,
    profile: profile
  }, (response) => {
    if (response && response.success && response.data) {
      const result = response.data.result;
      resultCard.innerHTML = `
        <div style="font-family: 'Space Grotesk', sans-serif; font-size:14px; font-weight:700; color: #10b981; margin-bottom: 6px;">
          ${mode === 'define' ? '📖 Definition' : '💡 Explanation'}: "${escapeHtml(text)}"
        </div>
        <div style="font-size:14px; line-height:1.5;">${parseSimpleMarkdown(result)}</div>
        <button style="background:transparent; border:none; color:inherit; opacity:0.5; font-size:11px; cursor:pointer; padding: 4px 0; margin-top:8px;" class="bm-dismiss-card-btn">Dismiss</button>
      `;
      resultCard.querySelector(".bm-dismiss-card-btn").addEventListener("click", () => {
        resultCard.remove();
      });
      // Allow speaking this block too!
      wireTTSElement(resultCard);
    } else {
      const err = (response && response.error) ? response.error : "Could not connect to backend.";
      resultCard.innerHTML = `
        <div style="color: #ef4444; font-size:13px;">Error: ${err}</div>
        <button style="background:transparent; border:none; color:inherit; opacity:0.5; font-size:11px; cursor:pointer; padding: 4px 0; margin-top:8px;" class="bm-dismiss-card-btn">Dismiss</button>
      `;
      resultCard.querySelector(".bm-dismiss-card-btn").addEventListener("click", () => {
        resultCard.remove();
      });
    }
  });
}

/**
 * Text to speech system variables
 */
let synth = window.speechSynthesis;
let currentUtterance = null;
let activeSpeechElement = null;
let originalSpeechHTML = "";

function speakTextWithHighlight(text, element) {
  if (synth.speaking) {
    synth.cancel();
    if (activeSpeechElement) {
      activeSpeechElement.innerHTML = originalSpeechHTML;
    }
    if (activeSpeechElement === element) {
      activeSpeechElement = null;
      return;
    }
  }

  activeSpeechElement = element;
  originalSpeechHTML = element.innerHTML;

  const clone = element.cloneNode(true);
  const controls = clone.querySelector(".bm-tts-controls");
  if (controls) controls.remove();
  const rawText = clone.innerText.trim();

  // Highlight words
  const words = rawText.split(/(\s+)/);
  let html = "";
  let offset = 0;

  words.forEach(word => {
    if (/\s+/.test(word)) {
      html += word;
      offset += word.length;
    } else {
      const start = offset;
      const end = offset + word.length;
      html += `<span class="bm-highlight-sentence" data-start="${start}" data-end="${end}">${escapeHtml(word)}</span>`;
      offset += word.length;
    }
  });

  html += ` <span class="bm-tts-controls"><button class="bm-tts-btn" title="Stop Speaking">⏹️</button></span>`;
  element.innerHTML = html;

  element.querySelector(".bm-tts-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    synth.cancel();
  });

  const wordSpans = element.querySelectorAll(".bm-highlight-sentence");

  currentUtterance = new SpeechSynthesisUtterance(rawText);
  
  chrome.storage.local.get(["ttsRate"], (settings) => {
    currentUtterance.rate = settings.ttsRate || 1.0;
    synth.speak(currentUtterance);
  });

  currentUtterance.onboundary = (event) => {
    if (event.name === "word") {
      const charIndex = event.charIndex;
      wordSpans.forEach(span => {
        const start = parseInt(span.getAttribute("data-start"));
        const end = parseInt(span.getAttribute("data-end"));
        if (charIndex >= start && charIndex < end) {
          span.className = "bm-highlight-sentence bm-highlight-word";
        } else {
          span.className = "bm-highlight-sentence";
        }
      });
    }
  };

  currentUtterance.onend = () => {
    element.innerHTML = originalSpeechHTML;
    rewireSpeechButton(element);
    activeSpeechElement = null;
  };

  currentUtterance.onerror = () => {
    element.innerHTML = originalSpeechHTML;
    rewireSpeechButton(element);
    activeSpeechElement = null;
  };
}

function rewireSpeechButton(element) {
  const btn = element.querySelector(".bm-tts-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const clone = element.cloneNode(true);
      const controls = clone.querySelector(".bm-tts-controls");
      if (controls) controls.remove();
      speakTextWithHighlight(clone.innerText.trim(), element);
    });
  }
}

function wireTTSElement(el) {
  if (!el) return;
  const existing = el.querySelector(".bm-tts-controls");
  if (existing) existing.remove();

  const span = document.createElement("span");
  span.className = "bm-tts-controls";
  span.innerHTML = `<button class="bm-tts-btn" title="Speak Aloud">🔊</button>`;
  el.appendChild(span);
  
  rewireSpeechButton(el);
}

/**
 * Removes the adaptation overlay and restores original webpage state.
 */
function removeAdaptation() {
  // Cancel speech synthesiser
  if (synth) {
    synth.cancel();
  }

  const focusStyles = document.getElementById("bridgemind-focus-styles");
  if (focusStyles) {
    focusStyles.remove();
  }

  originalDisplayStyles.forEach((originalDisplay, el) => {
    if (el) {
      el.style.display = originalDisplay;
    }
  });
  originalDisplayStyles.clear();

  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }

  if (originalBodyStyles.overflow !== undefined) {
    document.body.style.overflow = originalBodyStyles.overflow;
  }
}

/**
 * Helper to escape HTML tags.
 */
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Simple Markdown compiler for headings, paragraphs, bullet lists, and bold text.
 */
function parseSimpleMarkdown(markdown) {
  if (!markdown) return "";
  
  let html = escapeHtml(markdown);
  
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  
  // Bold text: replace **text** with <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Bullet lists: replace * text with <li>
  html = html.replace(/^\*\s+(.*$)/gim, '<li>$1</li>');
  
  // Group <li> tags inside a <ul>
  html = html.split('\n').map(line => {
    if (line.startsWith("<h") || line.startsWith("<li>")) {
      return line;
    }
    if (line.trim().length === 0) {
      return "";
    }
    return `<p>${line}</p>`;
  }).join('\n');
  
  return html;
}

