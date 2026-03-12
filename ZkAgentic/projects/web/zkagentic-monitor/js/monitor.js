// Testnet Monitor — Supabase Realtime client for zkagentic.ai
(function () {
  var SUPABASE_URL = 'https://inqwwaqiptrmpruxczyy.supabase.co';
  var SUPABASE_ANON_KEY =
    '***REDACTED_JWT_HEADER***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucXd3YXFpcHRybXBydXhjenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTI2MTcsImV4cCI6MjA4NzMyODYxN30.***REDACTED***';

  var SIMULATOR_URL = 'https://onetrueclaude-creator-agentic-chain-simulator.streamlit.app/?embedded=true';
  var STALE_THRESHOLD = 120;   // seconds before "STALE"
  var OFFLINE_THRESHOLD = 600; // seconds before "OFFLINE"

  // State
  var lastUpdateTime = null;
  var simulatorLoaded = false;

  // Initialize Supabase
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS not loaded — monitor disabled');
    setText('testnet-status', 'Testnet: ERROR (Supabase not loaded)');
    return;
  }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM helpers (safe, no innerHTML) ---

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatNumber(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('en-US');
  }

  function formatSeconds(s) {
    if (s == null) return '—';
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    var rem = s % 60;
    return m + 'm ' + rem + 's';
  }

  function timeAgo(date) {
    var diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return Math.floor(diff / 3600) + 'h ago';
  }

  // --- Update DOM from chain_status ---

  function updateChainStatus(row) {
    if (!row) return;
    lastUpdateTime = new Date();

    // Hero
    setText('hero-block', formatNumber(row.blocks_processed));
    var subtitle = 'Epoch Ring ' + (row.epoch_ring || 0);
    if (row.state_root) {
      subtitle += ' \u00B7 State: ' + row.state_root.slice(0, 12) + '...';
    }
    setText('hero-subtitle', subtitle);

    // Mining card
    setText('mining-value', formatNumber(row.total_mined));

    // Network card (claims from chain_status)
    setText('network-claims', formatNumber(row.total_claims));

    // Block Production card
    setText('blocks-next', row.next_block_in != null ? row.next_block_in + 's' : '—');
    setText('blocks-avg', '~60s'); // target block time

    // Epoch card
    setText('epoch-ring', 'Ring ' + (row.epoch_ring || 0));
    setText('epoch-hardness', (row.epoch_ring || 0) * 16 + 'x');

    // Footer
    setText('last-updated', 'Last updated: just now');
    updateLiveStatus('live');
  }

  // --- Update DOM from agents aggregate ---

  function updateAgents(agents) {
    if (!agents || !Array.isArray(agents)) return;

    setText('network-agents', formatNumber(agents.length));

    var totalCpu = 0;
    for (var i = 0; i < agents.length; i++) {
      totalCpu += (agents[i].staked_cpu || 0);
    }
    setText('staking-cpu', formatNumber(totalCpu) + ' CPU');
  }

  // --- Live/Stale/Offline indicator ---

  function updateLiveStatus(status) {
    var dot = document.getElementById('live-dot');
    var text = document.getElementById('live-text');
    var statusEl = document.getElementById('testnet-status');
    if (!dot || !text) return;

    dot.className = 'dot';

    if (status === 'live') {
      dot.className = 'dot dot-live';
      text.textContent = 'LIVE';
      text.style.color = '#22c55e';
      if (statusEl) statusEl.textContent = 'Testnet: LIVE';
    } else if (status === 'stale') {
      dot.className = 'dot dot-stale';
      text.textContent = 'STALE';
      text.style.color = '#eab308';
      if (statusEl) statusEl.textContent = 'Testnet: STALE';
    } else {
      dot.className = 'dot dot-offline';
      text.textContent = 'OFFLINE';
      text.style.color = '#ef4444';
      if (statusEl) statusEl.textContent = 'Testnet: OFFLINE';
    }
  }

  function checkHeartbeat() {
    if (!lastUpdateTime) {
      updateLiveStatus('offline');
      return;
    }

    var diffSec = Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000);
    setText('last-updated', 'Last updated: ' + timeAgo(lastUpdateTime));

    if (diffSec < STALE_THRESHOLD) {
      updateLiveStatus('live');
    } else if (diffSec < OFFLINE_THRESHOLD) {
      updateLiveStatus('stale');
    } else {
      updateLiveStatus('offline');
    }
  }

  // --- Fetch initial data ---

  async function fetchChainStatus() {
    var result = await sb.from('chain_status').select('*').single();
    if (result.error) {
      console.error('chain_status fetch error:', result.error);
      setText('testnet-status', 'Testnet: ERROR (' + result.error.message + ')');
      return;
    }
    updateChainStatus(result.data);
  }

  async function fetchAgents() {
    var result = await sb.from('agents').select('staked_cpu');
    if (result.error) {
      console.error('agents fetch error:', result.error);
      return;
    }
    updateAgents(result.data);
  }

  // --- Realtime subscription ---

  function subscribeRealtime() {
    sb.channel('monitor-chain-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chain_status' }, function (payload) {
        if (payload.eventType === 'DELETE') return;
        updateChainStatus(payload.new);
      })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: subscribed to chain_status');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('Realtime: connection lost, status =', status);
          updateLiveStatus('offline');
        }
      });
  }

  // --- Tab switching ---

  window.switchTab = function (tab) {
    var dashboardContainer = document.getElementById('dashboard-container');
    var simulatorContainer = document.getElementById('simulator-container');
    var tabDashboard = document.getElementById('tab-dashboard');
    var tabSimulator = document.getElementById('tab-simulator');

    if (tab === 'simulator') {
      if (dashboardContainer) dashboardContainer.style.display = 'none';
      if (simulatorContainer) simulatorContainer.style.display = 'block';
      if (tabDashboard) { tabDashboard.className = 'tab-btn tab-inactive'; }
      if (tabSimulator) { tabSimulator.className = 'tab-btn tab-active'; }

      // Lazy-load simulator iframe on first click
      if (!simulatorLoaded) {
        var frame = document.getElementById('simulator-frame');
        if (frame) frame.src = SIMULATOR_URL;
        simulatorLoaded = true;
      }
    } else {
      if (dashboardContainer) dashboardContainer.style.display = 'block';
      if (simulatorContainer) simulatorContainer.style.display = 'none';
      if (tabDashboard) { tabDashboard.className = 'tab-btn tab-active'; }
      if (tabSimulator) { tabSimulator.className = 'tab-btn tab-inactive'; }
    }
  };

  // --- Initialize ---

  fetchChainStatus();
  fetchAgents();
  subscribeRealtime();

  // Heartbeat: check staleness every 10 seconds
  setInterval(checkHeartbeat, 10000);
})();
