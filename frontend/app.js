// BridgeMind Web Simulator Logic

document.addEventListener("DOMContentLoaded", () => {
  const profileBtns = document.querySelectorAll(".sim-profile-btn");
  const paneAfter = document.getElementById("pane-after");
  const tldrBox = document.getElementById("adapted-tldr-box");
  const textBox = document.getElementById("adapted-text-box");
  
  // Theme Switches inside the adapted preview pane
  const themePills = document.querySelectorAll(".theme-pills:not(#sim-ruler-toggle)");

  // Concept Map elements in sim
  const simCmapBtn = document.getElementById("sim-cmap-btn");
  const simCmapDrawer = document.getElementById("sim-cmap-drawer");
  const simCloseCmap = document.getElementById("sim-close-cmap");

  // Focus Ruler elements in sim
  const simRulerToggle = document.getElementById("sim-ruler-toggle");
  const simRuler = document.getElementById("sim-reading-ruler");
  const adaptedArea = document.querySelector(".adapted-content-area");
  let isSimRulerActive = false;

  // Chat elements in sim
  const simAskBtn = document.getElementById("sim-ask-btn");
  const simChatSidebar = document.getElementById("sim-chat-sidebar");
  const simCloseChat = document.getElementById("sim-close-chat");
  const simSendChat = document.getElementById("sim-send-chat");
  const simChatInput = document.getElementById("sim-chat-input");
  const simChatMessages = document.getElementById("sim-chat-messages");

  // Interactive Theme Pills
  themePills.forEach(pill => {
    pill.addEventListener("click", () => {
      themePills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      
      const selectedTheme = pill.getAttribute("data-theme");
      // Remove previous themes
      paneAfter.classList.remove("theme-cream", "theme-sepia", "theme-dark");
      // Add new
      paneAfter.classList.add(`theme-${selectedTheme}`);
    });
  });

  // Focus Ruler Toggle & Track
  simRulerToggle.addEventListener("click", () => {
    isSimRulerActive = !isSimRulerActive;
    simRuler.classList.toggle("hidden", !isSimRulerActive);
    simRulerToggle.style.background = isSimRulerActive ? "#10b981" : "rgba(16, 185, 129, 0.1)";
    simRulerToggle.style.color = isSimRulerActive ? "#fff" : "#10b981";
  });

  adaptedArea.addEventListener("mousemove", (e) => {
    if (!isSimRulerActive) return;
    const rect = adaptedArea.getBoundingClientRect();
    const top = e.clientY - rect.top + adaptedArea.scrollTop - 17.5; // offset
    simRuler.style.top = `${top}px`;
  });

  // Concept Map drawer toggle
  if (simCmapBtn && simCmapDrawer && simCloseCmap) {
    simCmapBtn.addEventListener("click", () => {
      simCmapDrawer.classList.toggle("hidden");
      if (!simCmapDrawer.classList.contains("hidden")) {
        simChatSidebar.classList.add("hidden");
        renderSimConceptMap();
      }
    });
    
    simCloseCmap.addEventListener("click", () => {
      simCmapDrawer.classList.add("hidden");
    });
  }

  // Chat sidebar toggle
  if (simAskBtn && simChatSidebar && simCloseChat) {
    simAskBtn.addEventListener("click", () => {
      simChatSidebar.classList.toggle("hidden");
      if (!simChatSidebar.classList.contains("hidden")) {
        simCmapDrawer.classList.add("hidden");
        simChatInput.focus();
      }
    });

    simCloseChat.addEventListener("click", () => {
      simChatSidebar.classList.add("hidden");
    });

    simSendChat.addEventListener("click", sendSimMessage);
    simChatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendSimMessage();
    });
  }

  function sendSimMessage() {
    const text = simChatInput.value.trim();
    if (!text) return;

    appendSimMsg("user", text);
    simChatInput.value = "";

    // AI replies
    setTimeout(() => {
      let reply = "I am running in simulated mode. In the Chrome extension, I will answer using live Gemini agents!";
      if (text.toLowerCase().includes("quantum") || text.toLowerCase().includes("entanglement")) {
        reply = "Quantum entanglement means **particles connect** so that measurements on one instantly change the other, regardless of distance!";
      } else if (text.toLowerCase().includes("einstein")) {
        reply = "Einstein, Podolsky, and Rosen studied this in **1935** and famously called it 'spooky action at a distance'.";
      }
      appendSimMsg("ai", reply);
    }, 600);
  }

  function appendSimMsg(sender, text) {
    const msg = document.createElement("div");
    msg.className = `sim-msg-${sender}`;
    msg.style.alignSelf = sender === "user" ? "flex-end" : "flex-start";
    msg.style.background = sender === "user" ? "#5b4fe9" : "rgba(120,120,120,0.08)";
    msg.style.color = sender === "user" ? "#fff" : "inherit";
    msg.style.padding = "6px 12px";
    msg.style.borderRadius = "8px";
    msg.style.fontSize = "12px";
    msg.style.maxWidth = "85%";
    msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    simChatMessages.appendChild(msg);
    simChatMessages.scrollTop = simChatMessages.scrollHeight;
  }

  // Profile Switching logic
  profileBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      profileBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const profile = btn.getAttribute("data-profile");
      updateSimulatorProfile(profile);
    });
  });

  function updateSimulatorProfile(profile) {
    // Reset classes
    paneAfter.className = "frame-half frame-after"; 
    
    if (simCmapDrawer) simCmapDrawer.classList.add("hidden");
    if (simChatSidebar) simChatSidebar.classList.add("hidden");
    if (synth) synth.cancel();

    if (profile === "adhd") {
      paneAfter.classList.add("theme-cream");
      setActiveThemePill("cream");
      
      tldrBox.className = "adapted-card adapted-tldr";
      tldrBox.innerHTML = `
        <h4>💡 Quick TL;DR Summary</h4>
        <ul>
          <li>Quantum entanglement connects particle states across distances.</li>
          <li>Measurements on one particle instantly affect the other.</li>
          <li>Proposed in 1935 by Einstein, Podolsky, and Rosen.</li>
        </ul>
      `;
      
      textBox.innerHTML = `
        <h3>Understanding Quantum Entanglement</h3>
        <p>Quantum entanglement occurs when <strong>particles connect</strong> in a way that links their physical properties.</p>
        <p>Because of this connection, actions on one particle <strong>instantly influence</strong> the other. This happens even if they are light-years apart.</p>
        <p>This behavior was first studied in 1935 by <strong>Einstein, Podolsky, and Rosen</strong>. They called it "spooky action at a distance."</p>
      `;
      
      simCmapBtn.style.display = "block";
      simAskBtn.style.display = "block";
    }
    
    else if (profile === "dyslexia") {
      paneAfter.classList.add("theme-sepia", "font-dyslexic");
      setActiveThemePill("sepia");
      
      tldrBox.className = "adapted-card adapted-tldr";
      tldrBox.innerHTML = `
        <h4>💡 Quick TL;DR Summary</h4>
        <ul>
          <li>Entangled particles share states.</li>
          <li>Actions on one instantly impact the other.</li>
          <li>Studied first in 1935.</li>
        </ul>
      `;
      
      textBox.innerHTML = `
        <h3>The Study of Entangled Particles</h3>
        <p>Some particles can <strong>link together</strong>. This link is called quantum entanglement.</p>
        <p>When particles link, measuring one will <strong>immediately change</strong> the other particle. This works over <strong>very large distances</strong>.</p>
        <p>Famous scientists <strong>Einstein, Podolsky, and Rosen</strong> first wrote about this in <strong>1935</strong>.</p>
      `;
      
      simCmapBtn.style.display = "block";
      simAskBtn.style.display = "block";
    }
    
    else if (profile === "autism") {
      paneAfter.classList.add("theme-cream");
      setActiveThemePill("cream");
      
      tldrBox.className = "adapted-card adapted-card-communication";
      tldrBox.innerHTML = `
        <div class="bm-warning-banner" style="margin-bottom: 12px; font-size: 11px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--color-warning); padding: 8px; border-radius: 6px; display: flex; gap: 8px;">
          <span>⚠️</span> <span><strong>Note:</strong> This page covers theoretical physics that can cause cognitive fatigue. Take regular breaks.</span>
        </div>
        <h4>📋 Step-by-Step Instructions</h4>
        <ol style="padding-left:16px;">
          <li style="margin-bottom:4px; font-size:12px;">You will <strong>define quantum entanglement</strong> as a link connecting particle states.</li>
          <li style="margin-bottom:4px; font-size:12px;">You will <strong>note</strong> that measuring one particle instantly changes the second particle.</li>
          <li style="margin-bottom:4px; font-size:12px;">You will <strong>cite</strong> Einstein, Podolsky, and Rosen as the discoverers of this effect in 1935.</li>
        </ol>
      `;
      
      textBox.innerHTML = `
        <h3>Quantum Entanglement Guide</h3>
        <p><strong>Definition:</strong> Particles interact and link. Their states cannot be explained alone.</p>
        <p><strong>Action Principle:</strong> Measure particle A. Particle B changes instantly. Distance does not prevent this connection.</p>
        <p><strong>History:</strong> Albert Einstein, Boris Podolsky, and Nathan Rosen published this theory in 1935.</p>
      `;
      
      simCmapBtn.style.display = "none";
      simAskBtn.style.display = "none";
    }

    wireSimTTS();
  }

  function setActiveThemePill(themeName) {
    themePills.forEach(p => {
      if (p.getAttribute("data-theme") === themeName) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
  }

  // Simulated Draggable SVG Concept Map Nodes Graph
  function renderSimConceptMap() {
    const canvas = document.getElementById("sim-svg-canvas");
    const svg = document.getElementById("sim-svg-connections");
    if (!canvas || !svg) return;

    canvas.querySelectorAll(".bm-svg-node").forEach(n => n.remove());

    const rootConcept = { id: "root", name: "Quantum Entanglement", isRoot: true, x: 75, y: 90 };
    const nodes = [
      { id: "node-0", name: "Particle Links", isRoot: false, x: 10, y: 15 },
      { id: "node-1", name: "Instant Effect", isRoot: false, x: 140, y: 15 },
      { id: "node-2", name: "1935 Study", isRoot: false, x: 75, y: 165 }
    ];

    const allConcepts = [rootConcept, ...nodes];

    allConcepts.forEach((c) => {
      const div = document.createElement("div");
      div.className = `bm-svg-node ${c.isRoot ? 'root' : ''}`;
      div.id = `sim-cmap-dom-${c.id}`;
      div.textContent = c.name;
      div.style.left = `${c.x}px`;
      div.style.top = `${c.y}px`;
      canvas.appendChild(div);

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

        drawSimConnections();
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          div.style.zIndex = c.isRoot ? 3 : 2;
        }
      });
    });

    function drawSimConnections() {
      svg.innerHTML = "";
      const root = allConcepts.find(c => c.isRoot);
      const rootDiv = document.getElementById(`sim-cmap-dom-${root.id}`);
      const rx = root.x + rootDiv.clientWidth / 2;
      const ry = root.y + rootDiv.clientHeight / 2;

      allConcepts.forEach((c) => {
        if (c.isRoot) return;
        const childDiv = document.getElementById(`sim-cmap-dom-${c.id}`);
        const cx = c.x + childDiv.clientWidth / 2;
        const cy = c.y + childDiv.clientHeight / 2;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const mx = (rx + cx) / 2;
        const my = (ry + cy) / 2 - 10;
        path.setAttribute("d", `M ${rx} ${ry} Q ${mx} ${my} ${cx} ${cy}`);
        path.setAttribute("class", "bm-svg-connection");
        svg.appendChild(path);
      });
    }

    setTimeout(drawSimConnections, 100);
  }

  // Simulator TTS Player setup
  let synth = window.speechSynthesis;
  let currentUtterance = null;
  let activeSpeechElement = null;
  let originalSpeechHTML = "";

  function wireSimTTS() {
    const blocks = document.querySelectorAll("#pane-after p, #pane-after h3, #pane-after li");
    blocks.forEach((block) => {
      if (block.querySelector(".bm-tts-controls")) return;
      const span = document.createElement("span");
      span.className = "bm-tts-controls";
      span.innerHTML = `<button class="bm-tts-btn">🔊</button>`;
      block.appendChild(span);
      
      const btn = span.querySelector(".bm-tts-btn");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const clone = block.cloneNode(true);
        const controls = clone.querySelector(".bm-tts-controls");
        if (controls) controls.remove();
        speakSimText(clone.innerText.trim(), block);
      });
    });
  }

  function speakSimText(text, element) {
    if (synth && synth.speaking) {
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
        html += `<span class="bm-highlight-sentence" data-start="${start}" data-end="${end}">${word}</span>`;
        offset += word.length;
      }
    });

    html += ` <span class="bm-tts-controls"><button class="bm-tts-btn" style="opacity:1;">⏹️</button></span>`;
    element.innerHTML = html;

    element.querySelector(".bm-tts-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      synth.cancel();
    });

    const wordSpans = element.querySelectorAll(".bm-highlight-sentence");

    currentUtterance = new SpeechSynthesisUtterance(rawText);
    currentUtterance.rate = 1.0;
    
    if (synth) {
      synth.speak(currentUtterance);
    }

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
      rewireSimSpeechButton(element);
      activeSpeechElement = null;
    };

    currentUtterance.onerror = () => {
      element.innerHTML = originalSpeechHTML;
      rewireSimSpeechButton(element);
      activeSpeechElement = null;
    };
  }

  function rewireSimSpeechButton(element) {
    const btn = element.querySelector(".bm-tts-btn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const clone = element.cloneNode(true);
        const controls = clone.querySelector(".bm-tts-controls");
        if (controls) controls.remove();
        speakSimText(clone.innerText.trim(), element);
      });
    }
  }

  // Initial wire
  wireSimTTS();
});
