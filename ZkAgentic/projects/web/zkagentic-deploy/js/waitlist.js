// Waitlist signup via Google OAuth + Supabase
// Supabase anon key is safe for client-side use — security enforced via RLS policies
(function () {
  var SUPABASE_URL = 'https://inqwwaqiptrmpruxczyy.supabase.co';
  var SUPABASE_ANON_KEY =
    '***REDACTED_JWT_HEADER***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucXd3YXFpcHRybXBydXhjenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTI2MTcsImV4cCI6MjA4NzMyODYxN30.***REDACTED***';

  // Initialize Supabase client (CDN exposes window.supabase)
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS not loaded — waitlist disabled');
    return;
  }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Remember newsletter consent across the OAuth redirect via sessionStorage
  // (localStorage would persist too long; sessionStorage survives the redirect)
  if (window.location.hash.indexOf('access_token') !== -1) {
    sb.auth.onAuthStateChange(function (event, session) {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        var savedConsent = sessionStorage.getItem('waitlist_newsletter') === 'true';
        sessionStorage.removeItem('waitlist_newsletter');
        handleWaitlistSignup(session, savedConsent);
        // Clean up the token hash from the URL
        history.replaceState(null, '', window.location.pathname);
      }
    });
  }

  // Called by the "Join Testnet Waitlist" button
  window.openWaitlist = async function () {
    // Check newsletter consent
    var consentBox = document.getElementById('newsletter-consent');
    var hasConsent = consentBox ? consentBox.checked : false;

    showStatus('Connecting to Google...', 'info');

    var result = await sb.auth.getSession();
    var session = result.data.session;

    if (session) {
      // Already signed in — try to insert directly
      await handleWaitlistSignup(session, hasConsent);
    } else {
      // Save consent before redirect (survives the round-trip)
      sessionStorage.setItem('waitlist_newsletter', String(hasConsent));
      // Redirect to Google OAuth
      var authResult = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (authResult.error) {
        showStatus('Could not connect to Google. Please try again.', 'error');
      }
      // If no error, the browser is redirecting to Google — nothing more to do
    }
  };

  async function handleWaitlistSignup(session, newsletterConsent) {
    var user = session.user;
    var meta = user.user_metadata || {};

    var result = await sb.from('waitlist').insert({
      email: user.email,
      name: meta.full_name || meta.name || null,
      avatar_url: meta.avatar_url || null,
      newsletter_consent: !!newsletterConsent,
    });

    if (result.error) {
      if (result.error.code === '23505') {
        showStatus("You're already on the waitlist! We'll reach out soon.", 'info');
      } else {
        console.error('Waitlist error:', result.error);
        showStatus('Something went wrong. Please try again.', 'error');
      }
    } else {
      showStatus("You're on the waitlist! We'll notify you when testnet launches.", 'success');
    }
  }

  function showStatus(message, type) {
    var el = document.getElementById('waitlist-status');
    if (!el) return;

    el.textContent = message;

    // Reset inline styles
    el.style.color = '';
    el.style.opacity = '1';

    if (type === 'success') {
      el.style.color = '#22d3ee'; // accent-cyan
    } else if (type === 'error') {
      el.style.color = '#f87171'; // red-400
    } else {
      el.style.color = '#a78bfa'; // purple-400
    }
  }
})();
