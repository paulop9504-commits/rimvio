const thread = document.getElementById("thread");
const recentsEl = document.getElementById("recents");
const crumb = document.getElementById("crumb");
const chipPc = document.getElementById("chip-pc");
const pip = document.getElementById("pip");
const pipImg = document.getElementById("pip-img");
const pipTitle = document.getElementById("pip-title");
const reply = document.getElementById("reply");

const ICONS = {
  web: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 4 3 14 0 18M12 3c-3 4-3 14 0 18"/></svg>',
  note: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
  key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="14" r="4"/><path d="M11.5 12.5L21 3v4"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
  chev: '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
  folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h6l2 2h10v10H3z"/></svg>',
};

let lastThreadKey = "";
let lastRecentsKey = "";
let lastShot = "";
let pipDismissed = false;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hostOf(url) {
  return String(url || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];
}

function mark(text) {
  return esc(text).replace(/(쿠팡|Chrome|Rimvio|카드)/g, '<span class="mark">$1</span>');
}

function phasePlan(phase, paired) {
  if (!paired) {
    return "같은 아이디로 로그인하면 이 PC가 알아서 연결돼요. 휴대폰에서 보낸 일이 여기서 이어져요.";
  }
  if (phase === "BROWSER_OPENED" || phase === "PAGE_READY") {
    return "브라우저를 열었어요. 화면이 준비되면 바로 이어서 맞춰요.";
  }
  if (phase === "WAITING_USER") {
    return "결제 직전이에요. 휴대폰에서 승인하면 멈추지 않고 이어가요.";
  }
  if (phase === "RUNNING" || phase === "ACTION_RUNNING") {
    return "지금 이 PC에서 진행하고 있어요. 화면은 오른쪽에서 바로 보여요.";
  }
  if (phase === "DONE" || phase === "COMPLETED") {
    return "여기까지 맞춰 두었어요. 다음 말을 기다리면 바로 이어가요.";
  }
  return "명령을 기다리면, 이 PC에서 바로 실행해요.";
}

function findings(work, health) {
  if (Array.isArray(work.findings) && work.findings.length) {
    return work.findings;
  }
  const items = [];
  if (health?.paired) {
    items.push({ kind: "note", title: "이 PC 연결됨", detail: "같은 계정으로 이어지는 중", ago: "지금" });
  } else if (health?.displayCode) {
    items.push({ kind: "key", title: "연결 코드", detail: health.displayCode, ago: "" });
  }
  if (work.url) {
    items.push({ kind: "web", title: hostOf(work.url), detail: work.url, ago: "지금" });
  }
  return items;
}

function findingRow(item) {
  return `<div class="finding">
    <span class="glyph">${ICONS[item.kind] || ICONS.note}</span>
    <div><b>${esc(item.title)}</b><p>${esc(item.detail || "")}</p></div>
    <span class="ago">${esc(item.ago || "")}</span>
  </div>`;
}

function renderThread(health, work) {
  const paired = Boolean(health.paired);
  const title = work.title || "내 PC";
  const userLine = work.userLine || "";
  const items = findings(work, health);
  const shot = work.screenshotJpeg ? `data:image/jpeg;base64,${work.screenshotJpeg}` : "";
  const site = hostOf(work.url);
  const searchTitle = site
    ? `맥락을 모았어요 · ${site}`
    : paired
      ? "이 PC 상태를 확인했어요"
      : "연결을 맞추는 중";

  thread.innerHTML = `
    <div class="headline">
      <h1>${esc(title)}</h1>
      <button type="button" class="more" aria-hidden="true">···</button>
    </div>
    ${userLine ? `<div class="user-row"><div class="user-bubble">${esc(userLine)}</div></div>` : ""}
    <p class="plan">${mark(phasePlan(work.phase, paired))}${
      !paired && health.displayCode
        ? `<br /><span class="wait-code">${esc(health.displayCode)}</span>`
        : ""
    }</p>
    <details class="tool" open>
      <summary>${ICONS.clock}<span>${esc(searchTitle)}</span>${ICONS.chev}</summary>
      ${items.map(findingRow).join("") || findingRow({ kind: "note", title: "대기 중", detail: "휴대폰에서 일을 보내면 여기에 쌓여요", ago: "" })}
    </details>
    ${
      shot || site
        ? `<details class="tool" open>
            <summary>${ICONS.folder}<span>${esc(site ? `${site} 열기` : "실행 화면")}</span>${ICONS.chev}</summary>
            ${
              shot
                ? `<div class="shot-card"><img alt="" src="${shot}" /></div>`
                : findingRow({ kind: "web", title: site, detail: "브라우저를 여는 중", ago: "지금" })
            }
          </details>`
        : ""
    }
  `;
}

function render(snapshot) {
  const health = snapshot?.health ?? {};
  const work = snapshot?.work ?? {};
  const paired = Boolean(health.paired);
  const title = work.title || "내 PC";
  crumb.innerHTML = `Rimvio <span>›</span> ${esc(title)} <span>·</span> 진행`;
  chipPc.classList.toggle("on", paired);
  document.getElementById("chip-pc-label").textContent = paired ? "이 PC" : "이 PC";

  const recentTitles = work.recents?.length ? work.recents : [title];
  const recentsKey = recentTitles.join("|");
  if (recentsKey !== lastRecentsKey) {
    lastRecentsKey = recentsKey;
    recentsEl.innerHTML = recentTitles
      .map(
        (item, i) =>
          `<button type="button" class="recent${i === 0 ? " active" : ""}">${esc(item)}</button>`,
      )
      .join("");
  }

  const threadKey = JSON.stringify({
    paired,
    code: health.displayCode || "",
    title,
    user: work.userLine || "",
    phase: work.phase || "",
    url: work.url || "",
    findings: work.findings || [],
    hasShot: Boolean(work.screenshotJpeg),
  });
  if (threadKey !== lastThreadKey) {
    lastThreadKey = threadKey;
    renderThread(health, work);
  } else if (work.screenshotJpeg && work.screenshotJpeg !== lastShot) {
    const inline = thread.querySelector(".shot-card img");
    if (inline) {
      inline.src = `data:image/jpeg;base64,${work.screenshotJpeg}`;
    }
  }

  const shot = work.screenshotJpeg || "";
  if (shot && shot !== lastShot && !pipDismissed) {
    lastShot = shot;
    pip.hidden = false;
    pipImg.src = `data:image/jpeg;base64,${shot}`;
    pipTitle.textContent = work.previewTitle || hostOf(work.url) || "실행 화면";
  } else if (!shot) {
    lastShot = "";
  }
}

async function tick() {
  try {
    render(await window.rimvioPc.snapshot());
  } catch {
    render({ health: { paired: false }, work: { title: "내 PC" } });
  }
}

document.getElementById("pip-close").addEventListener("click", () => {
  pipDismissed = true;
  pip.hidden = true;
});

document.getElementById("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = reply.value.trim();
  reply.value = "";
  if (!text) {
    return;
  }
  void (async () => {
    const result = await window.rimvioPc.run(text);
    if (result?.openRimvio || result?.error === "not_connected") {
      void window.rimvioPc.openRimvio();
    }
  })();
});

document.getElementById("btn-plus").addEventListener("click", () => {
  void window.rimvioPc.openRimvio();
});
document.getElementById("btn-new").addEventListener("click", () => {
  void window.rimvioPc.openRimvio();
});
document.getElementById("btn-search").addEventListener("click", () => {
  reply.focus();
});
document.getElementById("btn-pin").addEventListener("click", () => undefined);

void tick();
setInterval(() => {
  void tick();
}, 1400);
