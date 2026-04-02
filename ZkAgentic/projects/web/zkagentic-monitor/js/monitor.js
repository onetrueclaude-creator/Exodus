// Testnet Monitor — Supabase Realtime client for zkagentic.ai
(function () {
  var SUPABASE_URL = 'https://inqwwaqiptrmpxruyczy.supabase.co';
  var SUPABASE_ANON_KEY =
    '***REDACTED_ANON_KEY***';

  var STALE_THRESHOLD = 120;   // seconds before "STALE"
  var OFFLINE_THRESHOLD = 600; // seconds before "OFFLINE"

  // State
  var lastUpdateTime = null;
  var blockCountdownSec = null;  // client-side countdown between blocks
  var countdownInterval = null;

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

  // --- Block countdown timer ---

  function startBlockCountdown(seconds) {
    blockCountdownSec = Math.max(0, Math.round(seconds));
    setText('blocks-next', blockCountdownSec + 's');
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(function () {
      blockCountdownSec = Math.max(0, blockCountdownSec - 1);
      setText('blocks-next', blockCountdownSec + 's');
    }, 1000);
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

    // Block Production card — start client-side countdown
    startBlockCountdown(row.next_block_in || 60);
    setText('blocks-avg', '~60s'); // target block time

    // Epoch card
    setText('epoch-ring', 'Ring ' + (row.epoch_ring || 0));

    // Supply card
    setText('supply-value', formatNumber(row.circulating_supply));

    // Burned card
    setText('burned-value', formatNumber(row.burned_fees));

    // Epoch progress — threshold formula: threshold(N) = 4 * N * (N+1)
    var ring = row.epoch_ring || 0;
    var nextThreshold = 4 * (ring + 1) * (ring + 2);
    var prevThreshold = 4 * ring * (ring + 1);
    var mined = row.total_mined || 0;
    var progress = 0;
    if (nextThreshold > prevThreshold) {
      progress = Math.min(100, Math.round(((mined - prevThreshold) / (nextThreshold - prevThreshold)) * 100));
    }
    setText('epoch-progress-value', progress + '%');
    var bar = document.getElementById('epoch-progress-bar');
    if (bar) bar.style.width = progress + '%';

    // Use synced hardness value instead of client-side calculation
    setText('epoch-hardness', formatNumber(row.hardness) + 'x');

    // Footer
    setText('last-updated', 'Last updated: just now');
    updateLiveStatus('live');
  }

  // --- Update DOM from agents aggregate ---

  function updateAgents(agents) {
    if (!agents || !Array.isArray(agents)) return;

    setText('network-agents', formatNumber(agents.length));

    var totalCpu = 0;
    var tierCpu = { opus: 0, sonnet: 0, haiku: 0 };
    var tierCount = { opus: 0, sonnet: 0, haiku: 0 };
    for (var i = 0; i < agents.length; i++) {
      var cpu = agents[i].staked_cpu || 0;
      var tier = (agents[i].tier || '').toLowerCase();
      totalCpu += cpu;
      if (tier in tierCpu) {
        tierCpu[tier] += cpu;
        tierCount[tier]++;
      }
    }
    setText('staking-cpu', formatNumber(totalCpu) + ' CPU');

    // Tier breakdown (only show tiers that have agents)
    var opusEl = document.getElementById('staking-opus');
    var sonnetEl = document.getElementById('staking-sonnet');
    var haikuEl = document.getElementById('staking-haiku');
    if (opusEl) opusEl.textContent = 'Opus ' + tierCount.opus + ' (' + formatNumber(tierCpu.opus) + ')';
    if (sonnetEl) sonnetEl.textContent = 'Sonnet ' + tierCount.sonnet + ' (' + formatNumber(tierCpu.sonnet) + ')';
    if (haikuEl) haikuEl.textContent = 'Haiku ' + tierCount.haiku + ' (' + formatNumber(tierCpu.haiku) + ')';
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
    var result = await sb.from('agents').select('staked_cpu, tier');
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

    // Subscribe to agents table so staked_cpu total updates live when
    // new claims are registered (without requiring a page reload).
    sb.channel('monitor-agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, function () {
        // Re-fetch full agents list on any change — keeps staking total current
        fetchAgents();
      })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: subscribed to agents');
        }
      });
  }

  // --- Initialize ---

  fetchChainStatus();
  fetchAgents();
  subscribeRealtime();

  // Heartbeat: check staleness every 10 seconds
  setInterval(checkHeartbeat, 10000);
})();
