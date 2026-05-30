const analyticsKey = "no-contact-days-events";

function readAnalyticsEvents() {
  try {
    return JSON.parse(localStorage.getItem(analyticsKey)) || [];
  } catch {
    return [];
  }
}

function storeAnalyticsEvent(name, props = {}) {
  const events = readAnalyticsEvents();
  events.push({
    name,
    props,
    path: location.pathname,
    ts: new Date().toISOString()
  });
  localStorage.setItem(analyticsKey, JSON.stringify(events.slice(-200)));
}

window.trackEvent = function trackEvent(name, props = {}) {
  if (typeof window.plausible === "function") {
    window.plausible(name, { props });
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", name, props);
  }
  storeAnalyticsEvent(name, props);
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-event]");
  if (!target) return;
  window.trackEvent(target.dataset.event, {
    label: target.textContent.trim()
  });
});
