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
  const chars = [...text];
  let line = "";
  chars.forEach((char, index) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = testLine;
    }
    if (index === chars.length - 1 && line) ctx.fillText(line, x, y);
  });
}

function drawShareCard() {
  if (!state.profile) return;
  const canvas = $("#shareCanvas");
  const ctx = canvas.getContext("2d");
  const apartDays = daysBetween(state.profile.breakupDate);
  const name = $("#hideName").checked ? "someone" : state.profile.personName;
  const text = $("#shareText").value.trim() || "I did not text them today. I came back to myself instead.";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, 900, 1200);
  bg.addColorStop(0, "#f8f5ee");
  bg.addColorStop(0.58, "#edf2ed");
  bg.addColorStop(1, "#f6eee9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 1200);

  ctx.strokeStyle = "rgba(63, 95, 80, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, 776, 1076);
  ctx.strokeRect(94, 94, 712, 1012);

  ctx.fillStyle = "#b77d63";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("NO CONTACT DAYS", 120, 170);

  ctx.fillStyle = "#1f2723";
  ctx.font = "800 64px system-ui, sans-serif";
  wrapCanvasText(ctx, `Since the breakup with ${name}`, 120, 330, 660, 78);
  ctx.font = "900 150px system-ui, sans-serif";
  ctx.fillText(`Day ${apartDays}`, 112, 520);

  ctx.fillStyle = "#3f5f50";
  ctx.font = "700 46px system-ui, sans-serif";
  wrapCanvasText(ctx, text, 120, 690, 660, 68);

  ctx.fillStyle = "#6b746f";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText("Private breakup recovery tracker", 120, 1012);
  ctx.fillText(new Intl.DateTimeFormat("en-US").format(new Date()), 120, 1060);
}

$("#setupForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.profile = {
    personName: form.get("personName").trim(),
    startDate: form.get("startDate"),
    breakupDate: form.get("breakupDate"),
    lastContactDate: form.get("lastContactDate"),
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
