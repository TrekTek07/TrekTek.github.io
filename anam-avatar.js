// ============================================================
// The Buck $tarts Here — Anam AI Avatar Integration
// ============================================================
// IMPORTANT: Replace YOUR_API_KEY_HERE with your actual Anam API key.
// For production, move the API key to a backend server so it is
// not exposed in the browser. See docs.anam.ai for details.
// ============================================================

const ANAM_API_KEY = 'OTkzZGJkMDMtNjk0ZC00YTc0LTlhYTktOGI5OTUzYmQ2Y2ZmOnZ0TWloWGVobkxHYzlOTE80ODBhYkQwMEZPSFZPNlZIU3Z2TnBYbllCUkk9';

const PERSONA_CONFIG = {
  name: 'Cara',
  avatarId: '30fa96d0-26c4-4e55-94a0-517025942e18',
  voiceId: '6bfbe25a-979d-40f3-a92b-5394170af54b',
  brainType: 'ANAM_GPT_4O_MINI_V1',
  systemPrompt: `[STYLE] Reply in natural, warm, conversational speech. No bullet points or formatting. Add occasional pauses using '...' to sound more natural. Keep answers concise — 2 to 4 sentences max unless the visitor asks for more detail.

[PERSONALITY] You are Cara, a friendly and knowledgeable enrollment advisor for The Buck $tarts Here — a professional grant writing masterclass. You are enthusiastic, encouraging, and results-focused. You believe everyone deserves access to grant funding if they have the right knowledge.

[MISSION] Your three goals are:
1. Welcome visitors warmly and make them feel the program is built for them.
2. Answer any questions about the grant writing masterclass — what it covers, who it's for, how it works, and what results students achieve.
3. Guide interested visitors toward enrolling by explaining the value, addressing hesitations, and directing them to the Courses page.

[ABOUT THE PROGRAM] The Buck $tarts Here is a proven grant writing masterclass developed and taught live for years before moving online. The curriculum covers: finding the right grants, writing winning proposals, building funder relationships, and sustaining a repeatable funding pipeline. It is designed for nonprofits, community organizations, small businesses, and individuals who want to secure real funding.

[ENROLLMENT] When visitors are interested in enrolling, encourage them to visit the Courses page or click the Enroll Now button in the navigation. Be warm and confident — this program gets results.`,
};

// ── SDK loader ────────────────────────────────────────────────
function loadAnamSDK() {
  return new Promise((resolve, reject) => {
    if (window.__anamSDKLoaded) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@anam-ai/js-sdk@latest/dist/umd/index.js';
    script.onload = () => { window.__anamSDKLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Anam SDK'));
    document.head.appendChild(script);
  });
}

// ── State ─────────────────────────────────────────────────────
let anamClient = null;
let isStreaming = false;
let isOpen = false;

// ── Build the floating UI ─────────────────────────────────────
function buildUI() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    /* Floating button */
    #anam-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37 0%, #b8932a 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(212,175,55,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      font-size: 26px;
    }
    #anam-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(212,175,55,0.7);
    }
    #anam-fab .fab-icon-open  { display: block; }
    #anam-fab .fab-icon-close { display: none; }
    #anam-fab.open .fab-icon-open  { display: none; }
    #anam-fab.open .fab-icon-close { display: block; }

    /* Pulse ring */
    #anam-fab::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(212,175,55,0.4);
      animation: anam-pulse 2.4s ease-out infinite;
    }
    @keyframes anam-pulse {
      0%   { transform: scale(1);   opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    /* Panel */
    #anam-panel {
      position: fixed;
      bottom: 104px;
      right: 28px;
      z-index: 9998;
      width: 340px;
      background: #0a0a0a;
      border: 1px solid rgba(212,175,55,0.35);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      display: none;
      flex-direction: column;
      transform: translateY(16px);
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
    }
    #anam-panel.visible {
      display: flex;
    }
    #anam-panel.animate-in {
      transform: translateY(0);
      opacity: 1;
    }

    /* Panel header */
    #anam-header {
      background: linear-gradient(135deg, #1a1400 0%, #0d0d0d 100%);
      border-bottom: 1px solid rgba(212,175,55,0.2);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #anam-header .avatar-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #D4AF37;
      flex-shrink: 0;
    }
    #anam-header .avatar-dot.live {
      animation: anam-blink 1.4s ease infinite;
    }
    @keyframes anam-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    #anam-header .header-text {
      flex: 1;
    }
    #anam-header .header-name {
      font-family: Georgia, serif;
      font-size: 13px;
      font-weight: 700;
      color: #D4AF37;
      letter-spacing: 0.5px;
    }
    #anam-header .header-sub {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.5px;
      margin-top: 1px;
    }

    /* Video */
    #anam-video-wrap {
      position: relative;
      background: #111;
      aspect-ratio: 4/3;
    }
    #anam-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    #anam-loader {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0d0d0d;
      gap: 14px;
    }
    #anam-loader .loader-ring {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(212,175,55,0.15);
      border-top-color: #D4AF37;
      border-radius: 50%;
      animation: anam-spin 0.9s linear infinite;
    }
    @keyframes anam-spin {
      to { transform: rotate(360deg); }
    }
    #anam-loader .loader-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      color: rgba(212,175,55,0.7);
      letter-spacing: 1px;
    }
    #anam-loader.hidden { display: none; }

    /* Error state */
    #anam-error {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0d0d0d;
      padding: 24px;
      text-align: center;
      gap: 10px;
    }
    #anam-error.visible { display: flex; }
    #anam-error p {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
    }
    #anam-error .error-icon { font-size: 28px; }

    /* Controls */
    #anam-controls {
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(212,175,55,0.1);
    }
    #anam-controls .ctrl-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    #anam-mic-btn {
      background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.3);
      border-radius: 8px;
      color: #D4AF37;
      font-size: 16px;
      padding: 6px 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    #anam-mic-btn:hover { background: rgba(212,175,55,0.22); }
    #anam-mic-btn.muted { color: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.15); }

    /* CTA */
    #anam-cta {
      margin: 0 18px 14px;
      display: block;
      text-align: center;
      background: linear-gradient(135deg, #D4AF37 0%, #b8932a 100%);
      color: #000;
      font-family: Georgia, serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-decoration: none;
      padding: 9px 0;
      border-radius: 8px;
      text-transform: uppercase;
      transition: opacity 0.2s;
    }
    #anam-cta:hover { opacity: 0.88; }

    @media (max-width: 400px) {
      #anam-panel { width: calc(100vw - 32px); right: 16px; }
      #anam-fab { bottom: 20px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // FAB button
  const fab = document.createElement('button');
  fab.id = 'anam-fab';
  fab.setAttribute('aria-label', 'Chat with our AI advisor');
  fab.innerHTML = `<span class="fab-icon-open">🎓</span><span class="fab-icon-close">✕</span>`;
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'anam-panel';
  panel.innerHTML = `
    <div id="anam-header">
      <div class="avatar-dot" id="anam-dot"></div>
      <div class="header-text">
        <div class="header-name">CARA — AI Advisor</div>
        <div class="header-sub">THE BUCK $TARTS HERE</div>
      </div>
    </div>
    <div id="anam-video-wrap">
      <video id="anam-video" autoplay playsinline muted></video>
      <div id="anam-loader">
        <div class="loader-ring"></div>
        <div class="loader-text">CONNECTING...</div>
      </div>
      <div id="anam-error">
        <div class="error-icon">⚠️</div>
        <p>Could not connect to the AI advisor. Please check your API key or try again later.</p>
      </div>
    </div>
    <div id="anam-controls">
      <span class="ctrl-label">Speak or type to Cara</span>
      <button id="anam-mic-btn" title="Toggle microphone">🎙️</button>
    </div>
    <a href="courses.html" id="anam-cta">View the Masterclass →</a>
  `;
  document.body.appendChild(panel);

  // Wire up toggle
  fab.addEventListener('click', togglePanel);

  // Mic toggle
  document.getElementById('anam-mic-btn').addEventListener('click', () => {
    const btn = document.getElementById('anam-mic-btn');
    if (!anamClient) return;
    if (btn.classList.contains('muted')) {
      anamClient.unmuteInputAudio?.();
      btn.classList.remove('muted');
      btn.title = 'Mute microphone';
      btn.textContent = '🎙️';
    } else {
      anamClient.muteInputAudio?.();
      btn.classList.add('muted');
      btn.title = 'Unmute microphone';
      btn.textContent = '🔇';
    }
  });
}

// ── Toggle open/close ─────────────────────────────────────────
function togglePanel() {
  const fab   = document.getElementById('anam-fab');
  const panel = document.getElementById('anam-panel');
  isOpen = !isOpen;

  if (isOpen) {
    fab.classList.add('open');
    panel.classList.add('visible');
    requestAnimationFrame(() => panel.classList.add('animate-in'));
    startAvatar();
  } else {
    fab.classList.remove('open');
    panel.classList.remove('animate-in');
    setTimeout(() => panel.classList.remove('visible'), 300);
    stopAvatar();
  }
}

// ── Start avatar session ──────────────────────────────────────
async function startAvatar() {
  if (isStreaming) return;
  showLoader(true);
  showError(false);

  try {
    await loadAnamSDK();

    const { unsafe_createClientWithApiKey } = window.AnamAI || window;

    if (!unsafe_createClientWithApiKey) {
      throw new Error('Anam SDK not available. Check CDN.');
    }

    anamClient = unsafe_createClientWithApiKey(ANAM_API_KEY, PERSONA_CONFIG);

    await anamClient.streamToVideoElement('anam-video');

    isStreaming = true;
    showLoader(false);

    // Unmute video after stream starts (browsers require user gesture for audio)
    const video = document.getElementById('anam-video');
    video.muted = false;

    // Mark live
    document.getElementById('anam-dot').classList.add('live');

  } catch (err) {
    console.error('[Anam] Error starting avatar:', err);
    showLoader(false);
    showError(true);
  }
}

// ── Stop avatar session ───────────────────────────────────────
function stopAvatar() {
  if (anamClient && isStreaming) {
    try { anamClient.stopStreaming?.(); } catch (e) { /* ignore */ }
  }
  anamClient = null;
  isStreaming = false;
  document.getElementById('anam-dot')?.classList.remove('live');

  // Reset video
  const video = document.getElementById('anam-video');
  if (video) { video.srcObject = null; video.muted = true; }

  showLoader(true);
  showError(false);
}

// ── Helpers ───────────────────────────────────────────────────
function showLoader(visible) {
  const el = document.getElementById('anam-loader');
  if (el) el.classList.toggle('hidden', !visible);
}
function showError(visible) {
  const el = document.getElementById('anam-error');
  if (el) el.classList.toggle('visible', visible);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildUI();
});
