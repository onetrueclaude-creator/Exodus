// Subgrid Simulator — zkagentic.ai
(function () {
  var API_BASE = 'https://api.zkagentic.ai';
  var SUPABASE_URL = 'https://inqwwaqiptrmpxruyczy.supabase.co';
  var SUPABASE_ANON_KEY =
    '***REDACTED_ANON_KEY***';

  var CELL_TYPES = ['secure', 'develop', 'research', 'storage'];
  var CELL_COLORS = { secure: '#22c55e', develop: '#6366f1', research: '#8b5cf6', storage: '#14b8a6' };
  var cells = [];
  var currentWallet = 0;
  var initialized = false;
  var sb = null;
  var allocChannel = null;
  var rewardsChannel = null;

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  window.initSimulator = function () {
    if (initialized) return;
    initialized = true;

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    var select = document.getElementById('sim-wallet');
    for (var i = 0; i < 50; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Wallet ' + i + (i <= 8 ? ' (genesis)' : ' (empty)');
      select.appendChild(opt);
    }
    select.addEventListener('change', function () {
      currentWallet = parseInt(this.value);
      fetchCurrentAllocation();
      subscribeToWallet();
    });

    var grid = document.getElementById('sim-grid');
    cells = [];
    for (var j = 0; j < 64; j++) {
      var div = document.createElement('div');
      div.className = 'sim-cell';
      div.style.background = CELL_COLORS.secure;
      div.dataset.index = j;
      div.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var current = CELL_TYPES.indexOf(cells[idx]);
        var next = (current + 1) % CELL_TYPES.length;
        cells[idx] = CELL_TYPES[next];
        this.style.background = CELL_COLORS[CELL_TYPES[next]];
        updateCounters();
      });
      grid.appendChild(div);
      cells.push('secure');
    }
    updateCounters();
    fetchCurrentAllocation();
    subscribeToWallet();
  };

  function updateCounters() {
    var counts = { secure: 0, develop: 0, research: 0, storage: 0 };
    for (var i = 0; i < cells.length; i++) counts[cells[i]]++;
    setText('sim-count-secure', counts.secure);
    setText('sim-count-develop', counts.develop);
    setText('sim-count-research', counts.research);
    setText('sim-count-storage', counts.storage);
  }

  async function fetchCurrentAllocation() {
    try {
      var res = await fetch(API_BASE + '/api/resources/' + currentWallet);
      if (!res.ok) return;
      var data = await res.json();
      if (data.subgrid) {
        setText('sim-chain-secure', data.subgrid.secure_count || 0);
        setText('sim-chain-develop', data.subgrid.develop_count || 0);
        setText('sim-chain-research', data.subgrid.research_count || 0);
        setText('sim-chain-storage', data.subgrid.storage_count || 0);
      }
      setText('sim-yield-agntc', (data.agntc_per_block || 0).toFixed(4));
      setText('sim-yield-dev', (data.dev_points_per_block || 0).toFixed(2));
      setText('sim-yield-research', (data.research_points_per_block || 0).toFixed(2));
      setText('sim-yield-storage', (data.storage_per_block || 0).toFixed(2));
    } catch (e) {
      console.error('fetch allocation error:', e);
      setText('sim-status', 'API offline — deploy pending. Realtime updates still active.');
    }
  }

  window.applyAllocation = async function () {
    var counts = { secure: 0, develop: 0, research: 0, storage: 0 };
    for (var i = 0; i < cells.length; i++) counts[cells[i]]++;

    setText('sim-status', 'Applying...');
    try {
      var res = await fetch(API_BASE + '/api/resources/' + currentWallet + '/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(counts),
      });
      if (!res.ok) {
        var err = await res.json();
        setText('sim-status', 'Error: ' + (err.detail || res.statusText));
        return;
      }
      setText('sim-status', 'Applied! Yields accrue next block (~60s).');
      setTimeout(fetchCurrentAllocation, 1000);
    } catch (e) {
      setText('sim-status', 'Network error: ' + e.message);
    }
  };

  function subscribeToWallet() {
    if (allocChannel) sb.removeChannel(allocChannel);
    if (rewardsChannel) sb.removeChannel(rewardsChannel);

    allocChannel = sb.channel('sim-alloc-' + currentWallet)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subgrid_allocations',
        filter: 'wallet_index=eq.' + currentWallet
      }, function (payload) {
        if (payload.new) {
          setText('sim-chain-secure', payload.new.secure_cells || 0);
          setText('sim-chain-develop', payload.new.develop_cells || 0);
          setText('sim-chain-research', payload.new.research_cells || 0);
          setText('sim-chain-storage', payload.new.storage_cells || 0);
        }
      })
      .subscribe();

    rewardsChannel = sb.channel('sim-rewards-' + currentWallet)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'resource_rewards',
        filter: 'wallet_index=eq.' + currentWallet
      }, function (payload) {
        if (payload.new) {
          setText('sim-yield-agntc', (payload.new.agntc_earned || 0).toFixed(4));
          setText('sim-yield-dev', (payload.new.dev_points || 0).toFixed(2));
          setText('sim-yield-research', (payload.new.research_points || 0).toFixed(2));
          setText('sim-yield-storage', (payload.new.storage_size || 0).toFixed(2));
        }
      })
      .subscribe();
  }
})();
