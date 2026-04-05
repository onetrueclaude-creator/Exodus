// Subgrid Simulator — zkagentic.ai
// Phase 2: write-through via Supabase (no direct API calls)
(function () {
  var SUPABASE_URL = 'https://inqwwaqiptrmpxruyczy.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_Bf4rObV5_-SYcTZKytbL2g_YYjRKNRp';

  var CELL_TYPES = ['secure', 'develop', 'research', 'storage'];
  var CELL_COLORS = { secure: '#22c55e', develop: '#6366f1', research: '#8b5cf6', storage: '#14b8a6' };
  var cells = [];
  var currentWallet = 0;
  var initialized = false;
  var sb = null;
  var allocChannel = null;
  var rewardsChannel = null;
  var pendingChannel = null;

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
    // Phase 2: read from Supabase tables instead of direct API
    try {
      // Fetch subgrid allocation
      var allocResult = await sb.from('subgrid_allocations')
        .select('secure_cells, develop_cells, research_cells, storage_cells')
        .eq('wallet_index', currentWallet)
        .maybeSingle();

      if (allocResult.data) {
        setText('sim-chain-secure', allocResult.data.secure_cells || 0);
        setText('sim-chain-develop', allocResult.data.develop_cells || 0);
        setText('sim-chain-research', allocResult.data.research_cells || 0);
        setText('sim-chain-storage', allocResult.data.storage_cells || 0);
      } else {
        setText('sim-chain-secure', 0);
        setText('sim-chain-develop', 0);
        setText('sim-chain-research', 0);
        setText('sim-chain-storage', 0);
      }

      // Fetch resource rewards
      var rewardsResult = await sb.from('resource_rewards')
        .select('agntc_earned, dev_points, research_points, storage_size')
        .eq('wallet_index', currentWallet)
        .maybeSingle();

      if (rewardsResult.data) {
        setText('sim-yield-agntc', (parseFloat(rewardsResult.data.agntc_earned) || 0).toFixed(4));
        setText('sim-yield-dev', (parseFloat(rewardsResult.data.dev_points) || 0).toFixed(2));
        setText('sim-yield-research', (parseFloat(rewardsResult.data.research_points) || 0).toFixed(2));
        setText('sim-yield-storage', (parseFloat(rewardsResult.data.storage_size) || 0).toFixed(2));
      }
    } catch (e) {
      console.error('fetch allocation error:', e);
      setText('sim-status', 'Supabase read failed — check connection.');
    }
  }

  window.applyAllocation = async function () {
    var counts = { secure: 0, develop: 0, research: 0, storage: 0 };
    for (var i = 0; i < cells.length; i++) counts[cells[i]]++;

    setText('sim-status', 'Submitting...');
    try {
      // Phase 2: INSERT into pending_transactions (miner polls and processes)
      var result = await sb.from('pending_transactions').insert({
        wallet_index: currentWallet,
        action_type: 'assign_subgrid',
        payload: counts,
      });

      if (result.error) {
        setText('sim-status', 'Error: ' + result.error.message);
        return;
      }

      setText('sim-status', 'Queued — miner processes next block (~60s).');
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
          setText('sim-status', 'Updated via Realtime.');
        }
      })
      .subscribe();

    rewardsChannel = sb.channel('sim-rewards-' + currentWallet)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'resource_rewards',
        filter: 'wallet_index=eq.' + currentWallet
      }, function (payload) {
        if (payload.new) {
          setText('sim-yield-agntc', (parseFloat(payload.new.agntc_earned) || 0).toFixed(4));
          setText('sim-yield-dev', (parseFloat(payload.new.dev_points) || 0).toFixed(2));
          setText('sim-yield-research', (parseFloat(payload.new.research_points) || 0).toFixed(2));
          setText('sim-yield-storage', (parseFloat(payload.new.storage_size) || 0).toFixed(2));
        }
      })
      .subscribe();
  }
})();
