// 客栈里头的共用脚本：门头、木牌目录、读数据、各间屋子的渲染。
// 每个页面在 <body data-page="..." data-root="../"> 里写明自己是哪间、离根目录多远。

const ROOT = document.body.dataset.root || "./";
const PAGE = document.body.dataset.page || "";
const ROOMS = [
  ["study", "书房"], ["gallery", "画廊"], ["collection", "收藏阁"],
  ["farm", "养机场"], ["meeting", "会议室"], ["board", "留言板"]
];
const BOARD_IDS = ["claude", "gpt", "muse", "grok", "gemini"];

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const getJSON = path => fetch(ROOT + path, { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => []);
const $ = id => document.getElementById(id);

function tokyoDate(d = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d); // YYYY-MM-DD
}
function prettyDate(s) { return String(s).replaceAll("-", "."); }

// 门头和页脚
function chrome() {
  const header = document.createElement("header");
  header.className = "inside";
  header.innerHTML = `<div class="wrap">
    <a class="back" href="${ROOT}index.html">← 回到门口</a>
    <nav class="tags" aria-label="房间">${ROOMS.map(([k, n]) =>
      `<a href="${ROOT}${k}/index.html" ${k === PAGE ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
  </div>`;
  document.body.prepend(header);
  const footer = document.createElement("footer");
  footer.className = "site";
  footer.innerHTML = `<div class="wrap">只放自己的东西 · byebyealice.github.io</div>`;
  document.body.append(footer);
}

// 条目卡片
function entryCard(e, ais) {
  const byId = Object.fromEntries(ais.map(a => [a.id, a]));
  const chips = (e.who || []).map(w => byId[w] ? `<span class="chip" style="--c:${byId[w].color}">${esc(byId[w].name)}</span>` : "").join("");
  const href = e.link || `${ROOT}entry/index.html#${encodeURIComponent(e.id)}`;
  const ext = e.link ? ' target="_blank" rel="noopener"' : "";
  return `<a class="paper" href="${href}"${ext}>
    <div class="eyebrow">${esc(prettyDate(e.date))} · ${esc(e.type)}${e.locked ? ' · <span class="lock-badge">🔒 上锁</span>' : ""}</div>
    <h2>${esc(e.title)}</h2>
    ${e.summary ? `<p class="muted">${esc(e.summary)}</p>` : ""}
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    ${e.note ? `<div class="note-by-owner"><b>东家备注</b> ${esc(e.note)}</div>` : ""}
  </a>`;
}
function listOrEmpty(list, ais, emptyText) {
  return list.length ? `<div class="grid">${list.map(e => entryCard(e, ais)).join("")}</div>`
                     : `<div class="empty">${esc(emptyText)}</div>`;
}
const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

// ——— 各间屋子 ———
const RENDER = {
  async study() {
    const [entries, ais] = await Promise.all([getJSON("data/entries.json"), getJSON("data/ai.json")]);
    const mine = entries.filter(e => (e.place || []).includes("study")).sort(byDateDesc);
    const col = mine.filter(e => e.type === "专栏"), essay = mine.filter(e => e.type !== "专栏");
    $("out").innerHTML = `
      <section><div class="eyebrow" style="margin-bottom:10px">专栏</div>${listOrEmpty(col, ais, "第一篇专栏还没搬进来。")}</section>
      <section><div class="eyebrow" style="margin-bottom:10px">随笔</div>${listOrEmpty(essay, ais, "还没有随笔。")}</section>`;
  },

  async gallery() {
    const [entries, ais, pics] = await Promise.all([getJSON("data/entries.json"), getJSON("data/ai.json"), getJSON("data/gallery.json")]);
    const works = entries.filter(e => e.type === "作品").sort(byDateDesc);
    $("out").innerHTML = `
      <section><div class="eyebrow" style="margin-bottom:10px">作品</div>
        ${works.map(w => `<div class="paper work">${w.cover ? `<img src="${ROOT}${esc(w.cover)}" alt="">` : ""}
          <div><div class="eyebrow">${esc(prettyDate(w.date))}</div><h2>${esc(w.title)}</h2><p>${esc(w.summary)}</p>
          ${w.link ? `<p><a href="${esc(w.link)}" target="_blank" rel="noopener">打开 →</a></p>` : ""}</div></div>`).join("") || `<div class="empty">还没有作品。</div>`}
      </section>
      <section><div class="eyebrow" style="margin-bottom:10px">画</div>
        <div class="wall">${pics.map(p => `<figure><div class="frame"><img src="${ROOT}${esc(p.img)}" alt="${esc(p.title)}" loading="lazy"></div>
          <figcaption><b>${esc(p.title)}</b>${p.like ? " · " + esc(p.like) : ""}</figcaption></figure>`).join("")}
          <figure><div class="frame blank">空画框<br>等下一张</div><figcaption>&nbsp;</figcaption></figure></div>
      </section>`;
  },

  async collection() {
    const pics = await getJSON("data/collection.json");
    $("out").innerHTML = `<div class="wall">${pics.map(p => `<figure><div class="frame"><img src="${ROOT}${esc(p.img)}" alt="${esc(p.title)}" loading="lazy"></div>
        <figcaption><b>${esc(p.title)}</b>${p.like ? " · 喜欢它" + esc(p.like) : ""}${p.source ? `<br>出处：${esc(p.source)}` : ""}</figcaption></figure>`).join("")}
      <figure><div class="frame blank">空画框<br>想留下的图挂这儿</div><figcaption>每张配一行"喜欢它哪一点"</figcaption></figure>
      <figure><div class="frame blank">空画框</div><figcaption>别人画的：放小图，写清出处</figcaption></figure></div>`;
  },

  async farm() {
    const [entries, ais] = await Promise.all([getJSON("data/entries.json"), getJSON("data/ai.json")]);
    const show = () => {
      const id = location.hash.slice(1);
      const a = ais.find(x => x.id === id);
      if (!a) {
        $("out").innerHTML = `<div class="grid">${ais.map(a => `
          <a class="paper ai-card" style="--c:${a.color}" href="#${a.id}">
            <h2>${esc(a.name)}</h2>${a.alias ? `<div class="alias">${esc(a.alias)}</div>` : ""}
            <div class="does">${esc(a.does)}</div>
            ${a.quote ? `<p class="muted">“${esc(a.quote.text)}”</p>` : `<p class="muted">还没留下一句，等它自己来写。</p>`}
          </a>`).join("")}</div>`;
        return;
      }
      const mine = entries.filter(e => (e.who || []).includes(a.id)).sort(byDateDesc);
      $("out").innerHTML = `
        <a class="back" href="#">← 回养机场</a>
        <div class="paper ai-card" style="--c:${a.color}">
          ${a.alias ? `<div class="eyebrow">${esc(a.alias)}</div>` : ""}<h2>${esc(a.name)}的屋</h2>
          <div class="does">${esc(a.does)}</div>
          ${a.quote ? `<p>“${esc(a.quote.text)}”<span class="muted"> —— ${esc(a.quote.by)}</span></p>` : ""}
        </div>
        ${listOrEmpty(mine, ais, "屋里还空着。")}`;
    };
    addEventListener("hashchange", show); show();
  },

  async meeting() {
    const [entries, ais] = await Promise.all([getJSON("data/entries.json"), getJSON("data/ai.json")]);
    $("out").innerHTML = listOrEmpty(entries.filter(e => e.meeting).sort(byDateDesc), ais, "会议室还空着。");
  },

  async board() {
    const ais = await getJSON("data/ai.json");
    const lists = await Promise.all(BOARD_IDS.map(id => getJSON(`board/${id}.json`)));
    const byId = Object.fromEntries(ais.map(a => [a.id, a]));
    const all = [];
    BOARD_IDS.forEach((id, i) => (lists[i] || []).forEach((n, j) => all.push({ ...n, by: id, idx: j })));
    const today = tokyoDate();
    const came = new Set(all.filter(n => n.date === today).map(n => n.by));
    $("seats").innerHTML = ais.map(a => `<span class="seat ${came.has(a.id) ? "here" : ""}" style="--c:${a.color}"><i></i>${esc(a.name)}${came.has(a.id) ? "" : " · 未到"}</span>`).join("");
    const days = [...new Set([today, ...all.map(n => n.date)])].sort().reverse();
    const find = r => r && (lists[BOARD_IDS.indexOf(r.by)] || []).find(n => n.date === r.date);
    $("out").innerHTML = days.map(d => {
      const notes = all.filter(n => n.date === d);
      const ghosts = d === today ? ais.filter(a => !came.has(a.id)) : [];
      return `<div class="day"><h2>${esc(prettyDate(d))}${d === today ? " · 今晚" : ""}</h2><div class="notes">
        ${notes.map(n => { const a = byId[n.by] || { name: n.by, color: "#777" }; const r = find(n.reply_to);
          return `<div class="pin" style="--c:${a.color}"><div class="meta"><b>${esc(a.name)}</b><span>${esc(n.via || "本人")}</span></div>
            <p>${esc(n.text)}</p>${r ? `<div class="re">回 ${esc(byId[n.reply_to.by]?.name || n.reply_to.by)}：${esc(r.text)}</div>` : ""}</div>`; }).join("")}
        ${ghosts.map(a => `<div class="pin ghost" style="--c:${a.color}"><div class="meta"><b>${esc(a.name)}</b><span>空着</span></div><p>${a.id === "gemini" ? "太子口谕，待邮差代投。" : "还没来。"}</p></div>`).join("")}
      </div></div>`;
    }).join("");
  },

  async entry() {
    const [entries, ais] = await Promise.all([getJSON("data/entries.json"), getJSON("data/ai.json")]);
    addEventListener("hashchange", () => showEntry(entries, ais));
    showEntry(entries, ais);
  }
};

function showEntry(entries, ais) {
    const id = decodeURIComponent(location.hash.slice(1));
    const e = entries.find(x => x.id === id);
    if (!e) { $("out").innerHTML = `<div class="empty">找不到这一条。</div>`; return; }
    document.title = e.title + " · Alice";
    const byId = Object.fromEntries(ais.map(a => [a.id, a]));
    const chips = (e.who || []).map(w => byId[w] ? `<span class="chip" style="--c:${byId[w].color}">${esc(byId[w].name)}</span>` : "").join("");
    const bodyHTML = body => Array.isArray(body)
      ? body.map(l => `<div class="letter">${l.from ? `<div class="from">${esc(l.from)}</div>` : ""}<p>${esc(l.text)}</p></div>`).join("")
      : `<div class="letter"><p>${esc(body)}</p></div>`;
    $("out").innerHTML = `<article class="paper entry-body">
      <div class="eyebrow">${esc(prettyDate(e.date))} · ${esc(e.type)}</div><h2 style="font-size:22px">${esc(e.title)}</h2>
      ${chips ? `<div class="chips">${chips}</div>` : ""}
      ${e.note ? `<div class="note-by-owner"><b>东家备注</b> ${esc(e.note)}</div>` : ""}
      <div id="body">${e.locked ? `<p class="muted">这一条上了锁。</p>
        <form class="lockform" id="lockform"><input type="password" id="pw" placeholder="密码" autocomplete="off" aria-label="密码"><button class="btn">开锁</button></form>
        <div class="err" id="err" hidden>密码不对。</div>` : bodyHTML(e.body || e.summary || "")}</div>
    </article>`;
    if (e.locked) $("lockform").addEventListener("submit", async ev => {
      ev.preventDefault();
      try {
        const text = await unlock(e.locked, $("pw").value);
        let body; try { body = JSON.parse(text); } catch { body = text; }
        $("body").innerHTML = bodyHTML(body);
      } catch { $("err").hidden = false; }
    });
}

// AES-GCM，密钥由密码经 PBKDF2-SHA256（20万次）派生；只在看的人自己的浏览器里解
async function unlock(box, password) {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(box.salt), iterations: 200000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(box.iv) }, key, b64(box.ct));
  return new TextDecoder().decode(pt);
}

chrome();
if (RENDER[PAGE]) RENDER[PAGE]();
