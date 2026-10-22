(() => {
  const id = "G-6865L9VTW2";
  const key = "no-contact-days-analytics-consent-v1";
  const hosts = new Set(["www.thenocontacttracker.com", "thenocontacttracker.com"]);
  const events = new Set([
    "tracker_created", "daily_checkin_saved", "no_contact_days_calculated",
    "mini_no_contact_calculated", "mini_breakup_days_calculated",
    "milestone_card_downloaded", "free_tracker_link_copied"
  ]);
  let enabled = false;
  let loaded = false;
  let choice = null;
  try { choice = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  const disableKey = `ga-disable-${id}`;
  window[disableKey] = true;

  function start() {
    if (!hosts.has(location.hostname)) return;
    if (loaded) {
      enabled = true;
      window[disableKey] = false;
      return;
    }
    loaded = true;
    enabled = true;
    window[disableKey] = false;
    gtag("consent", "default", {
      analytics_storage: "granted", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    gtag("js", new Date());
    let referrer = "";
    try { referrer = new URL(document.referrer).origin + "/"; } catch { /* No referrer. */ }
    // URL parameters can contain a last-contact date. Do not report them.
    gtag("config", id, {
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: location.hostname,
      cookie_flags: "SameSite=Lax;Secure"
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  function clearCookies() {
    for (const entry of document.cookie.split(";")) {
      const name = entry.trim().split("=")[0];
      if (name !== "_ga" && !name.startsWith("_ga_")) continue;
      for (const domain of ["", location.hostname, ".thenocontacttracker.com"]) {
        document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax; Secure`;
      }
    }
  }

  // Ignore caller properties: they may contain emotional scores or private inputs.
  window.trackEvent = function trackEvent(name) {
    if (enabled && events.has(name)) gtag("event", name);
  };
  const panel = document.createElement("section");
  panel.className = "analytics-choice";
  panel.setAttribute("aria-label", "Analytics preferences");
  panel.innerHTML = '<p><strong>Help us understand what is useful.</strong> Allow Google Analytics cookies to measure visits, return visits, and basic tool use? Your journal entries and tool inputs are not sent. All tools work if you decline. <a href="/privacy/">Privacy details</a></p><div class="analytics-actions"><button type="button" data-choice="denied">Decline analytics</button><button type="button" data-choice="granted">Allow analytics</button><button type="button" data-close>Close</button></div>';
  panel.hidden = choice === "granted" || choice === "denied";
  const preferences = document.createElement("button");
  preferences.type = "button";
  preferences.className = "analytics-preferences";
  preferences.textContent = "Analytics preferences";
  preferences.addEventListener("click", () => {
    panel.hidden = false;
    panel.querySelector("button").focus();
  });
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-close")) {
      panel.hidden = true;
      preferences.focus();
      return;
    }
    const next = button.dataset.choice;
    if (next !== "granted" && next !== "denied") return;
    choice = next;
    try { localStorage.setItem(key, choice); } catch { /* Choice applies to this page. */ }
    panel.hidden = true;
    if (choice === "granted") start();
    else {
      enabled = false;
      window[disableKey] = true;
      clearCookies();
      // Google's opt-out flag stops cookies and sends without losing unsaved tool inputs.
    }
    preferences.focus();
  });
  document.body.appendChild(panel);
  (document.querySelector(".site-footer") || document.body).appendChild(preferences);
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      choice = event.newValue;
      panel.hidden = choice === "granted" || choice === "denied";
      if (choice === "granted") start();
      else {
        enabled = false;
        window[disableKey] = true;
        clearCookies();
      }
    }
  });
  if (choice === "granted") start();
})();
