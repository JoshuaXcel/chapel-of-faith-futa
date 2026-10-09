/* ============================================================
   The Chapel of Faith, FUTA · site configuration
   ------------------------------------------------------------
   API_BASE_URL empty  -> DEMO MODE: data lives in this browser
                          (localStorage), seeded from data/seed.json.
   API_BASE_URL set    -> LIVE MODE: every read/write goes to the
                          FastAPI backend, e.g. "https://api.chapeloffaithfuta.org/api/v1"
   See API.md for the full contract.
   ============================================================ */
window.CONFIG = {
  API_BASE_URL: '',
  // If your FastAPI login uses OAuth2PasswordRequestForm (form fields username/password)
  // instead of a JSON body, set this to true.
  LOGIN_FORM_ENCODED: false,
  // Paystack PUBLIC key (pk_test_… / pk_live_…). Never put the secret key here.
  PAYSTACK_PUBLIC_KEY: ''
};
