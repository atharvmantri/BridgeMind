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
    const mainNode = data.comprehension_output.concept_map.main;
    const subNodes = data.comprehension_output.concept_map.nodes
      .map(node => `<div class="bm-cmap-node">${escapeHtml(node)}</div>`)
      .join("");

    conceptMapHtml = `
      <div class="bm-cmap-drawer hidden" id="bm-cmap-drawer">
        <div class="bm-cmap-header">
          <h3>Visual Concept Map</h3>
          <button class="bm-cmap-close" id="btn-close-cmap">&times;</button>
        </div>
        <div class="bm-cmap-canvas">
          <div class="bm-cmap-root">${escapeHtml(mainNode)}</div>
          <div class="bm-cmap-arrow"></div>
          <div class="bm-cmap-nodes-grid">
            ${subNodes}
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
        <!-- Font Adjusters -->
        <button class="bm-nav-btn" id="btn-font-dec" title="Decrease font size">A-</button>
        <button class="bm-nav-btn" id="btn-font-inc" title="Increase font size">A+</button>
        
        <!-- Font family toggle -->
        <button class="bm-nav-btn" id="btn-toggle-font" title="Toggle Dyslexic Font">Dyslexia Font</button>
        
        <!-- Theme Selectors -->
        <div class="bm-themes">
          <button class="bm-theme-btn cream active" data-theme="cream" title="Cream Theme"></button>
          <button class="bm-theme-btn sepia" data-theme="sepia" title="Sepia Theme"></button>
          <button class="bm-theme-btn dark" data-theme="dark" title="Dark Theme"></button>
          <button class="bm-theme-btn high-contrast" data-theme="high-contrast" title="High Contrast Theme"></button>
        </div>

        <!-- Undo Button -->
        <button class="bm-btn-close" id="btn-close-bm">Restore Original</button>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="bm-content-wrapper">
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

    <!-- Concept Map Drawer -->
    ${conceptMapHtml}
  `;

  // Prepend to body
  document.body.appendChild(overlayElement);
  
  // Prevent original page scrolling, use overlay scrolling instead
  originalBodyStyles.overflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

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

  // Font adjusters
  let currentSizePercent = 100;
  const contentWrapper = overlayElement.querySelector(".bm-content-wrapper");
  
  document.getElementById("btn-font-inc").addEventListener("click", () => {
    currentSizePercent += 10;
    contentWrapper.style.fontSize = `${currentSizePercent}%`;
  });
  
  document.getElementById("btn-font-dec").addEventListener("click", () => {
    if (currentSizePercent > 80) {
      currentSizePercent -= 10;
      contentWrapper.style.fontSize = `${currentSizePercent}%`;
    }
  });

  // Dyslexia Font Toggle
  document.getElementById("btn-toggle-font").addEventListener("click", () => {
    overlayElement.classList.toggle("font-dyslexic");
    overlayElement.classList.toggle("spacing-dyslexic");
  });

  // Summary Toggle Tabs
  if (data.comprehension_output) {
    const tabSimple = document.getElementById("btn-tab-simple");
    const tabDetailed = document.getElementById("btn-tab-detailed");
    const summaryContent = document.getElementById("bm-summary-content");

    tabSimple.addEventListener("click", () => {
      tabSimple.classList.add("active");
      tabDetailed.classList.remove("active");
      summaryContent.innerHTML = escapeHtml(data.comprehension_output.simple_version);
    });

    tabDetailed.addEventListener("click", () => {
      tabDetailed.classList.add("active");
      tabSimple.classList.remove("active");
      summaryContent.innerHTML = escapeHtml(data.comprehension_output.detailed_version);
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
  }
}

/**
 * Removes the adaptation overlay and restores original webpage state.
 */
function removeAdaptation() {
  // 1. Remove injected focus stylesheet
  const focusStyles = document.getElementById("bridgemind-focus-styles");
  if (focusStyles) {
    focusStyles.remove();
  }

  // 2. Restore hidden original page elements
  originalDisplayStyles.forEach((originalDisplay, el) => {
    if (el) {
      el.style.display = originalDisplay;
    }
  });
  originalDisplayStyles.clear();

  // 3. Remove overlay from DOM
  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }

  // 4. Restore scrollbars
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
    // If it's a heading, bullet or empty, just return it
    if (line.startsWith("<h") || line.startsWith("<li>")) {
      return line;
    }
    if (line.trim().length === 0) {
      return "";
    }
    // Wrap normal text lines in paragraph tags
    return `<p>${line}</p>`;
  }).join('\n');
  
  return html;
}
