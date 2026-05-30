const storeKey = "no-contact-days-mvp";

const defaultState = {
  profile: null,
  checkins: [],
  letters: [],
  vault: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

let state = loadState();
let shareTextDirty = false;

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(storeKey)) };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDateInput(value) {
  const trimmed = String(value || "").trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}`;
  }
  return trimmed;
}

function isValidISODate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function daysBetween(dateA, dateB = todayISO()) {
  if (!dateA) return 0;
  const start = new Date(`${dateA}T00:00:00`);
  const end = new Date(`${dateB}T00:00:00`);
  const diff = Math.floor((end - start) / 86400000);
  return Math.max(diff, 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  if (!state.profile) {
    $("#setupPanel").classList.remove("hidden");
    $("#dashboard").classList.add("hidden");
    return;
  }

  $("#setupPanel").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");

  const { personName, breakupDate, startDate, lastContactDate } = state.profile;
  const apartDays = daysBetween(breakupDate);
  const noContactDays = daysBetween(lastContactDate || breakupDate);
  const togetherDays = startDate ? daysBetween(startDate, breakupDate) : 0;

  $("#displayName").textContent = personName;
  $("#daysApart").textContent = apartDays;
  $("#heroDaysApart").textContent = apartDays;
  $("#noContactDays").textContent = noContactDays;
  $("#togetherDays").textContent = togetherDays ? `${togetherDays} days` : "Not set";
  $("#checkinCount").textContent = state.checkins.length;
  $("#vaultCount").textContent = state.vault.length;
  $("#heroMessage").textContent = state.profile.vow || "You do not have to feel healed today. You only have to stay close to yourself.";

  renderLetters();
  renderVault();
  renderTimeline();
  updateShareText();
  drawShareCard();
}

function renderLetters() {
  $("#lettersList").innerHTML = state.letters.length
    ? state.letters
        .slice()
        .reverse()
        .map((item) => `
          <article class="list-item">
            <span>${formatDate(item.date)} · ${item.openAt ? `Open on ${formatDate(item.openAt)}` : "Sealed"}</span>
            <p>${escapeHTML(item.text)}</p>
          </article>
        `)
        .join("")
    : `<article class="list-item"><p>No unsent letters yet.</p></article>`;
}

function renderVault() {
  $("#vaultList").innerHTML = state.vault.length
    ? state.vault
        .slice()
        .reverse()
        .map((item) => `
          <article class="list-item">
            <span>${escapeHTML(item.type)} · ${formatDate(item.date)}</span>
            <p><strong>${escapeHTML(item.title)}</strong></p>
            <p>${escapeHTML(item.content || "Sealed.")}</p>
          </article>
        `)
        .join("")
    : `<article class="list-item"><p>You can seal a song, a place, a sentence, or a promise here.</p></article>`;
}

function renderTimeline() {
  const apartDays = daysBetween(state.profile.breakupDate);
  const milestoneText = [
    [1, "Day 1", "Everything may still feel loud, but you started tracking instead of reaching out."],
    [7, "Day 7", "The first week matters. You gave yourself space through the hardest early stretch."],
    [14, "Day 14", "Missing them may still arrive, but it does not have to take the whole day."],
    [30, "Day 30", "You are learning not to treat every notification as an answer."],
    [50, "Day 50", "Your own rhythm is starting to become visible again."],
    [100, "Day 100", "The relationship can be part of your story without being the whole story."],
    [365, "Day 365", "A year later, the memory can exist without running your life."]
  ];

  const milestones = milestoneText
    .filter(([day]) => apartDays >= day)
    .map(([day, title, text]) => ({ day, title, text, kind: "milestone" }));

  const checkins = state.checkins.map((item) => ({
    day: daysBetween(state.profile.breakupDate, item.date),
    title: `${formatDate(item.date)} · Missing level ${item.missLevel}/10`,
    text: item.note || (item.urge ? "You felt the urge to contact them, and you came here first." : "You completed a quiet check-in today."),
    kind: "checkin"
  }));

  const nodes = [...milestones, ...checkins].sort((a, b) => b.day - a.day);
  $("#timelineList").innerHTML = nodes.length
    ? nodes
        .map((item) => `
          <div class="timeline-node">
            <strong>${escapeHTML(item.title)} · Day ${item.day}</strong>
            <p>${escapeHTML(item.text)}</p>
          </div>
        `)
        .join("")
    : `<div class="timeline-node"><strong>Day 0</strong><p>Your recovery milestones will appear here after you start your tracker.</p></div>`;
}

function updateShareText(force = false) {
  const shareText = $("#shareText");
  if (!force && shareTextDirty) return;
  const latest = state.checkins.at(-1);
  shareText.value = latest?.note || "I did not text them today. I came back to myself instead.";
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/(\s+)/);
  let line = "";
  words.forEach((word, index) => {
    const testLine = line + word;
    if (ctx.measureText(testLine.trim()).width > maxWidth && line.trim()) {
      ctx.fillText(line, x, y);
      line = word.trimStart();
      y += lineHeight;
    } else {
      line = testLine;
    }
    if (index === words.length - 1 && line.trim()) ctx.fillText(line.trimEnd(), x, y);
  });
}

function drawShareCard() {
  if (!state.profile) return;
  const canvas = $("#shareCanvas");
  const ctx = canvas.getContext("2d");
  const apartDays = daysBetween(state.profile.breakupDate);
  const name = $("#hideName").checked ? "someone" : state.profile.personName;
  const text = $("#shareText").value.trim() || "I did not text them today. I came back to myself instead.";

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fffaf1");
  bg.addColorStop(0.42, "#f2f6ef");
  bg.addColorStop(1, "#efe7df");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(820, 160, 40, 820, 160, 440);
  glow.addColorStop(0, "rgba(183, 125, 99, 0.22)");
  glow.addColorStop(1, "rgba(183, 125, 99, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 253, 250, 0.76)";
  roundRect(ctx, 94, 94, 892, 1162, 34);
  ctx.fill();

  ctx.strokeStyle = "rgba(63, 95, 80, 0.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, 94, 94, 892, 1162, 34);
  ctx.stroke();
  ctx.strokeStyle = "rgba(183, 125, 99, 0.22)";
  roundRect(ctx, 132, 132, 816, 1086, 24);
  ctx.stroke();

  ctx.fillStyle = "#b77d63";
  ctx.font = "800 32px system-ui, sans-serif";
  ctx.fillText("NO CONTACT DAYS", 174, 214);

  ctx.fillStyle = "#3f5f50";
  ctx.beginPath();
  ctx.arc(858, 202, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffdfa";
  ctx.font = "900 44px system-ui, sans-serif";
  ctx.fillText("N", 844, 218);

  ctx.fillStyle = "#1f2723";
  ctx.font = "850 70px system-ui, sans-serif";
  wrapCanvasText(ctx, `Since the breakup with ${name}`, 174, 392, 720, 82);
  ctx.font = "950 176px system-ui, sans-serif";
  ctx.fillText(`Day ${apartDays}`, 166, 632);

  ctx.fillStyle = "#3f5f50";
  ctx.font = "800 48px system-ui, sans-serif";
  wrapCanvasText(ctx, text, 174, 812, 720, 66);

  ctx.fillStyle = "#6b746f";
  ctx.font = "650 28px system-ui, sans-serif";
  ctx.fillText("Private breakup recovery tracker", 174, 1126);
  ctx.fillText(new Intl.DateTimeFormat("en-US").format(new Date()), 174, 1174);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

$("#setupForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const setupError = $("#setupError");
  const personName = form.get("personName").trim();
  const startDate = normalizeDateInput(form.get("startDate"));
  const breakupDate = normalizeDateInput(form.get("breakupDate"));
  const lastContactDate = normalizeDateInput(form.get("lastContactDate"));

  setupError.textContent = "";
  if (!personName) {
    setupError.textContent = "Please enter a name or nickname.";
    return;
  }
  if (!breakupDate) {
    setupError.textContent = "Please enter your breakup date.";
    return;
  }
  if (![startDate, breakupDate, lastContactDate].every(isValidISODate)) {
    setupError.textContent = "Use a valid date like 2023-05-01 or 20230501.";
    return;
  }

  state.profile = {
    personName,
    startDate,
    breakupDate,
    lastContactDate,
    vow: form.get("vow").trim()
  };
  saveState();
  window.trackEvent?.("tracker_created");
  render();
});

$("#checkinForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const existingIndex = state.checkins.findIndex((item) => item.date === todayISO());
  const item = {
    date: todayISO(),
    missLevel: Number(form.get("missLevel")),
    urge: form.get("urge") === "on",
    note: form.get("note").trim()
  };
  if (existingIndex >= 0) state.checkins[existingIndex] = item;
  else state.checkins.push(item);
  saveState();
  $("#todayResult").textContent = item.urge
    ? "You put the urge here first. That is not avoidance; it is a pause that protects your peace."
    : "You did not contact them today. That is not cold; it is you protecting your healing.";
  window.trackEvent?.("daily_checkin_saved", {
    urge: item.urge,
    missLevel: item.missLevel
  });
  render();
});

$("#missLevel").addEventListener("input", (event) => {
  $("#missValue").textContent = event.target.value;
});

$("#letterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const form = new FormData(event.currentTarget);
  const text = form.get("letter").trim();
  if (!text) return;
  const openAt = new Date();
  openAt.setDate(openAt.getDate() + 30);
  state.letters.push({
    date: todayISO(),
    text,
    openAt: submitter.dataset.mode === "later" ? openAt.toISOString().slice(0, 10) : ""
  });
  event.currentTarget.reset();
  saveState();
  window.trackEvent?.("unsent_letter_saved", {
    mode: submitter.dataset.mode
  });
  render();
});

$("#vaultForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.vault.push({
    date: todayISO(),
    type: form.get("type"),
    title: form.get("title").trim(),
    content: form.get("content").trim()
  });
  event.currentTarget.reset();
  saveState();
  window.trackEvent?.("memory_saved", {
    type: state.vault.at(-1).type
  });
  render();
});

$$(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    $$(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
    $(`#${button.dataset.tab}Panel`).classList.remove("hidden");
    if (button.dataset.tab === "share") drawShareCard();
  });
});

$("#shareText").addEventListener("input", drawShareCard);
$("#shareText").addEventListener("input", () => {
  shareTextDirty = true;
});
$("#hideName").addEventListener("change", drawShareCard);

$("#downloadCard").addEventListener("click", () => {
  drawShareCard();
  const link = document.createElement("a");
  link.download = `no-contact-days-card-${todayISO()}.png`;
  link.href = $("#shareCanvas").toDataURL("image/png");
  link.click();
  window.trackEvent?.("milestone_card_downloaded");
});

$("#resetBtn").addEventListener("click", () => {
  const confirmed = confirm("Start over? This will clear the tracker stored in this browser.");
  if (!confirmed) return;
  state = { ...defaultState };
  saveState();
  render();
});

render();
