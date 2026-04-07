// Waitlist signup — direct email insert via Supabase (no OAuth)
(function () {
  var SUPABASE_URL = 'https://inqwwaqiptrmpxruyczy.supabase.co';
  var SUPABASE_ANON_KEY =
    'sb_publishable_Bf4rObV5_-SYcTZKytbL2g_YYjRKNRp';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS not loaded — waitlist disabled');
    return;
  }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.submitWaitlist = async function () {
    var emailInput = document.getElementById('waitlist-email');
    var consentBox = document.getElementById('newsletter-consent');
    var email = emailInput ? emailInput.value.trim() : '';

    // Basic email validation
    if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      showStatus('Please enter a valid email address.', 'error');
      return;
    }

    showStatus('Submitting...', 'info');

    var result = await sb.from('waitlist').insert({
      email: email,
      newsletter_consent: consentBox ? consentBox.checked : false,
    });

    if (result.error) {
      if (result.error.code === '23505') {
        showStatus("You're already on the waitlist!", 'info');
      } else {
        console.error('Waitlist error:', result.error);
        showStatus('Error: ' + (result.error.message || result.error.code || 'Unknown'), 'error');
      }
    } else {
      showStatus("You're on the waitlist! We'll be in touch soon.", 'success');
      if (emailInput) emailInput.value = '';
    }
  };

  function showStatus(message, type) {
    var el = document.getElementById('waitlist-status');
    if (!el) return;
    el.textContent = message;
    if (type === 'success') el.style.color = '#22d3ee';
    else if (type === 'error') el.style.color = '#f87171';
    else el.style.color = '#a78bfa';
  }
})();
