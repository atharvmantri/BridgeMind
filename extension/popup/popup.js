// BridgeMind Extension Popup Logic

document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const masterToggle = document.getElementById("master-toggle");
  const profileCards = document.querySelectorAll(".profile-card");
  const customSettingsPanel = document.getElementById("custom-settings-panel");
  const btnAdaptPage = document.getElementById("btn-adapt-page");
  const adaptLoader = document.getElementById("adapt-loader");
  const statusMessage = document.getElementById("status-message");
  
  // Custom agents elements
  const toggleFocus = document.getElementById("toggle-focus");
  const toggleReader = document.getElementById("toggle-reader");
  const toggleComprehension = document.getElementById("toggle-comprehension");
  const toggleCommunication = document.getElementById("toggle-communication");
  const toggleEmotion = document.getElementById("toggle-emotion");
  const focusLevelSlider = document.getElementById("focus-level");
  const focusLevelVal = document.getElementById("focus-level-val");
  const ttsRateSlider = document.getElementById("tts-rate");
  const ttsRateVal = document.getElementById("tts-rate-val");

  let activeProfile = "adhd"; // Default profile

  // Focus level indicator update
  focusLevelSlider.addEventListener("input", (e) => {
    focusLevelVal.textContent = e.target.value;
  });

  // TTS speed indicator update
  ttsRateSlider.addEventListener("input", (e) => {
    ttsRateVal.textContent = e.target.value;
    saveSettings();
  });

  // Load saved configuration on popup open
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["activeProfile", "masterEnabled", "customSettings", "ttsRate"], (settings) => {
      if (settings.masterEnabled !== undefined) {
        masterToggle.checked = settings.masterEnabled;
      }
      if (settings.activeProfile) {
        activeProfile = settings.activeProfile;
        selectProfileCard(activeProfile);
      }
      if (settings.customSettings) {
        const cs = settings.customSettings;
        toggleFocus.checked = cs.focus;
        toggleReader.checked = cs.reader;
        toggleComprehension.checked = cs.comprehension;
        toggleCommunication.checked = cs.communication;
        toggleEmotion.checked = cs.emotion;
        focusLevelSlider.value = cs.focusLevel || 2;
        focusLevelVal.textContent = cs.focusLevel || 2;
      }
      if (settings.ttsRate !== undefined) {
        ttsRateSlider.value = settings.ttsRate;
        ttsRateVal.textContent = settings.ttsRate;
      } else {
        ttsRateSlider.value = 1.0;
        ttsRateVal.textContent = "1.0";
      }
    });
  }

  // Profile Card clicks
  profileCards.forEach(card => {
    card.addEventListener("click", () => {
      const profileId = card.id.replace("profile-", "");
      activeProfile = profileId;
      selectProfileCard(profileId);
      saveSettings();
    });
  });

  // Save on slider toggle updates
  const customToggles = [toggleFocus, toggleReader, toggleComprehension, toggleCommunication, toggleEmotion, focusLevelSlider];
  customToggles.forEach(elem => {
    elem.addEventListener("change", saveSettings);
  });

  function selectProfileCard(profileId) {
    profileCards.forEach(c => {
      c.classList.remove("active");
      c.setAttribute("aria-pressed", "false");
    });
    
    const selectedCard = document.getElementById(`profile-${profileId}`);
    if (selectedCard) {
      selectedCard.classList.add("active");
      selectedCard.setAttribute("aria-pressed", "true");
    }

    // Show/hide custom options
    if (profileId === "custom") {
      customSettingsPanel.classList.remove("hidden");
    } else {
      customSettingsPanel.classList.add("hidden");
    }
  }

  function saveSettings() {
    if (chrome.storage && chrome.storage.local) {
      const customSettings = {
        focus: toggleFocus.checked,
        reader: toggleReader.checked,
        comprehension: toggleComprehension.checked,
        communication: toggleCommunication.checked,
        emotion: toggleEmotion.checked,
        focusLevel: parseInt(focusLevelSlider.value)
      };
      
      chrome.storage.local.set({
        activeProfile: activeProfile,
        masterEnabled: masterToggle.checked,
        customSettings: customSettings,
        ttsRate: parseFloat(ttsRateSlider.value)
      });
    }
  }

  // Trigger Adapt Page Flow
  btnAdaptPage.addEventListener("click", async () => {
    showStatus("Connecting to active tab...", "info");
    
    // Check if master toggle is enabled
    if (!masterToggle.checked) {
      showStatus("Please enable BridgeMind using the top toggle first.", "error");
      return;
    }

    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus("No active browser tab found.", "error");
        return;
      }

      // Check if it's a chrome:// URL which we can't scripts in
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        showStatus("BridgeMind cannot run on browser system pages.", "error");
        return;
      }

      showStatus("Extracting content...", "info");
      setLoading(true);

      // 2. Message Content Script to extract text
      chrome.tabs.sendMessage(tab.id, { action: "extractPageContent" }, (extractResponse) => {
        // If content script hasn't loaded (e.g. extension just installed)
        if (chrome.runtime.lastError || !extractResponse) {
          console.warn("Content script not responding. Attempting injection...", chrome.runtime.lastError);
          showStatus("Please refresh the page to load the extension.", "error");
          setLoading(false);
          return;
        }

        const { content, pageType } = extractResponse;
        if (!content || content.trim().length === 0) {
          showStatus("No readable content found on this webpage.", "error");
          setLoading(false);
          return;
        }

        showStatus("AI agents adapting content...", "info");

        // 3. Resolve active agents
        let agents = [];
        let options = {
          focus_level: 2,
          reading_level: "standard"
        };

        if (activeProfile === "adhd") {
          agents = ["reader", "focus", "comprehension"];
          options.focus_level = 3;
        } else if (activeProfile === "dyslexia") {
          agents = ["reader", "focus", "comprehension"];
          options.focus_level = 2;
        } else if (activeProfile === "autism") {
          agents = ["reader", "focus", "communication", "emotion"];
          options.focus_level = 2;
        } else {
          // Custom profile
          if (toggleFocus.checked) agents.push("focus");
          if (toggleReader.checked) agents.push("reader");
          if (toggleComprehension.checked) agents.push("comprehension");
          if (toggleCommunication.checked) agents.push("communication");
          if (toggleEmotion.checked) agents.push("emotion");
          options.focus_level = parseInt(focusLevelSlider.value);
        }

        // 4. Send adaptation request to Background Service Worker (so we avoid CORS in Content Script)
        chrome.runtime.sendMessage({
          action: "adaptPage",
          content: content,
          pageType: pageType,
          profile: activeProfile,
          agents: agents,
          options: options
        }, (adaptResponse) => {
          setLoading(false);
          
          if (chrome.runtime.lastError) {
            showStatus("Communication failed with background task.", "error");
            return;
          }

          if (adaptResponse && adaptResponse.success) {
            showStatus("Injecting adaptations...", "info");
            
            // 5. Message Content Script to inject transformations
            chrome.tabs.sendMessage(tab.id, {
              action: "injectAdaptation",
              data: adaptResponse.data,
              profile: activeProfile
            }, (injectResponse) => {
              if (injectResponse && injectResponse.success) {
                showStatus("Page adapted successfully!", "success");
              } else {
                showStatus("Failed to inject changes into page.", "error");
              }
            });
          } else {
            const errStr = (adaptResponse && adaptResponse.error) ? adaptResponse.error : "Backend error";
            showStatus(errStr, "error");
          }
        });
      });
    } catch (e) {
      console.error(e);
      showStatus("An unexpected error occurred.", "error");
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      adaptLoader.classList.remove("hidden");
      btnAdaptPage.setAttribute("disabled", "true");
    } else {
      adaptLoader.classList.add("hidden");
      btnAdaptPage.removeAttribute("disabled");
    }
  }

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = "status-msg"; // reset
    if (type === "error") {
      statusMessage.classList.add("error");
    } else if (type === "success") {
      statusMessage.classList.add("success");
    }
  }
});
