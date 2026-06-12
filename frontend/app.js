// BridgeMind Web Simulator Logic

document.addEventListener("DOMContentLoaded", () => {
  const profileBtns = document.querySelectorAll(".sim-profile-btn");
  const paneAfter = document.getElementById("pane-after");
  const tldrBox = document.getElementById("adapted-tldr-box");
  const textBox = document.getElementById("adapted-text-box");
  
  // Theme Switches inside the adapted preview pane
  const themePills = document.querySelectorAll(".theme-pills");

  // Concept Map elements in sim
  const simCmapBtn = document.getElementById("sim-cmap-btn");
  const simCmapDrawer = document.getElementById("sim-cmap-drawer");
  const simCloseCmap = document.getElementById("sim-close-cmap");

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

  // Concept Map drawer toggle
  if (simCmapBtn && simCmapDrawer && simCloseCmap) {
    simCmapBtn.addEventListener("click", () => {
      simCmapDrawer.classList.toggle("hidden");
    });
    
    simCloseCmap.addEventListener("click", () => {
      simCmapDrawer.classList.add("hidden");
    });
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
    paneAfter.className = "frame-half frame-after"; // keeps default frame structure
    
    // Hide drawer by default when switching profiles
    if (simCmapDrawer) {
      simCmapDrawer.classList.add("hidden");
    }

    if (profile === "adhd") {
      // Apply ADHD configuration
      paneAfter.classList.add("theme-cream");
      setActiveThemePill("cream");
      
      // Setup TLDR
      tldrBox.className = "adapted-card adapted-tldr";
      tldrBox.innerHTML = `
        <h4>💡 Quick TL;DR Summary</h4>
        <ul>
          <li>Quantum entanglement connects particle states across distances.</li>
          <li>Measurements on one particle instantly affect the other.</li>
          <li>Proposed in 1935 by Einstein, Podolsky, and Rosen.</li>
        </ul>
      `;
      
      // Setup text
      textBox.innerHTML = `
        <h3>Understanding Quantum Entanglement</h3>
        <p>Quantum entanglement occurs when <strong>particles connect</strong> in a way that links their physical properties.</p>
        <p>Because of this connection, actions on one particle <strong>instantly influence</strong> the other. This happens even if they are light-years apart.</p>
        <p>This behavior was first studied in 1935 by <strong>Einstein, Podolsky, and Rosen</strong>. They called it "spooky action at a distance."</p>
      `;
      
      // Show Map button
      simCmapBtn.style.display = "block";
    }
    
    else if (profile === "dyslexia") {
      // Apply Dyslexia configuration
      paneAfter.classList.add("theme-sepia", "font-dyslexic");
      setActiveThemePill("sepia");
      
      // Dyslexia reading style: larger word and character breaks
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
        <p>Some particles can **link together**. This link is called quantum entanglement.</p>
        <p>When particles link, measuring one will **immediately change** the other particle. This works over **very large distances**.</p>
        <p>Famous scientists **Einstein, Podolsky, and Rosen** first wrote about this in **1935**.</p>
      `;
      
      simCmapBtn.style.display = "block";
    }
    
    else if (profile === "autism") {
      // Apply Autism configuration
      paneAfter.classList.add("theme-cream");
      setActiveThemePill("cream");
      
      // Autism: replaces TLDR summary with explicit numbered action steps (Communication Agent)
      // Adds a Distress alert (Emotion Agent)
      tldrBox.className = "adapted-card adapted-card-communication";
      tldrBox.innerHTML = `
        <div class="bm-warning-banner" style="margin-bottom: 12px; font-size: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--color-warning); padding: 8px; border-radius: 6px;">
          ⚠️ <strong>Note:</strong> This page covers theoretical physics that can cause cognitive fatigue. Take regular breaks.
        </div>
        <h4>📋 Step-by-Step Instructions</h4>
        <ol>
          <li>You will **define quantum entanglement** as a link connecting particle states.</li>
          <li>You will **note** that measuring one particle instantly changes the second particle.</li>
          <li>You will **cite** Einstein, Podolsky, and Rosen as the discoverers of this effect in 1935.</li>
        </ol>
      `;
      
      textBox.innerHTML = `
        <h3>Quantum Entanglement Guide</h3>
        <p><strong>Definition:</strong> Particles interact and link. Their states cannot be explained alone.</p>
        <p><strong>Action Principle:</strong> Measure particle A. Particle B changes instantly. Distance does not prevent this connection.</p>
        <p><strong>History:</strong> Albert Einstein, Boris Podolsky, and Nathan Rosen published this theory in 1935.</p>
      `;
      
      // Hide map button for this profile to keep layout predictable
      simCmapBtn.style.display = "none";
    }
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
});
