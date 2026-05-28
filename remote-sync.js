(function () {
  const STORAGE_KEY = "tft-space-gods-cup";
  const REMOTE_STATE_ID = "tftrise-main";
  const HYDRATED_KEY = "tftrise-remote-hydrated";
  const ACCOUNTS_KEY = "tftrise-accounts";
  const PROFILE_KEY = "tftrise-profile";
  const ADMIN_PIN = "Yuuya1228";
  let supabaseClient = null;
  let saveTimer = null;
  let lastSaved = "";
  const originalSetItem = localStorage.setItem.bind(localStorage);

  installEnhancements();

  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (key === STORAGE_KEY) scheduleSave(value);
  };

  initRemoteSync().catch((error) => console.warn("TFTRise remote sync disabled:", error));

  async function initRemoteSync() {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) return;
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    await hydrateFromRemote();
    scheduleSave(localStorage.getItem(STORAGE_KEY) || "");
  }

  async function hydrateFromRemote() {
    const { data, error } = await supabaseClient.from("app_state").select("data").eq("id", REMOTE_STATE_ID).maybeSingle();
    if (error) throw error;
    if (!data?.data) return;
    const remoteJson = JSON.stringify(data.data);
    const localJson = localStorage.getItem(STORAGE_KEY) || "";
    lastSaved = remoteJson;
    if (remoteJson && remoteJson !== localJson && sessionStorage.getItem(HYDRATED_KEY) !== remoteJson) {
      sessionStorage.setItem(HYDRATED_KEY, remoteJson);
      originalSetItem(STORAGE_KEY, remoteJson);
      location.reload();
    }
  }

  function scheduleSave(value) {
    if (!supabaseClient || !value || value === lastSaved) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRemoteState(value).catch((error) => console.warn("TFTRise remote save failed:", error)), 700);
  }

  async function saveRemoteState(value) {
    if (!supabaseClient || !value || value === lastSaved) return;
    const parsed = JSON.parse(value);
    const { error } = await supabaseClient.from("app_state").upsert({
      id: REMOTE_STATE_ID,
      data: parsed,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    lastSaved = value;
  }

  function installEnhancements() {
    const css = document.createElement("style");
    css.textContent = `
      #adminOpenBtn { display: none !important; }
      .public-nav { align-items: center !important; }
      .nav-button { min-width: 118px !important; min-height: 48px !important; }
      .nav-button[data-go="home"] { min-width: 154px !important; min-height: 54px !important; border-color: rgba(239,197,109,.76) !important; color: #160d05 !important; background: linear-gradient(180deg,#ffe28f,#e5a93e) !important; box-shadow: 0 14px 30px rgba(239,197,109,.18) !important; font-size: 1rem !important; }
      .nav-button[data-go="home"].active, .nav-button[data-go="home"]:hover { color: #160d05 !important; background: linear-gradient(180deg,#fff0b4,#f0bd52) !important; }
      .owner-options-text { width: 100%; justify-content: center; }
      .system-panel { display: grid; gap: 12px; max-width: 920px; }
      .system-card { border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 12px; background: rgba(255,255,255,.035); }
      .system-card:not([open]) { background: rgba(255,255,255,.025) !important; }
      .system-card[open] { border-color: rgba(88,199,255,.22) !important; }
      .system-card summary { cursor: pointer; color: #f7fbff; font-weight: 900; }
      .system-card p, .system-card li { color: #aab7cb; line-height: 1.75; }
      .system-card ul { margin: 10px 0 0; padding-left: 18px; }
      .owner-system-card { max-width: 360px; }
      .admin-player-input { width: min(190px,100%); min-height: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 6px; padding: 7px 9px; color: #f7fbff; background: rgba(5,10,22,.72); font: inherit; }
      @media (max-width: 640px) {
        .site-header { grid-template-columns: minmax(0,1fr) auto !important; gap: 8px !important; padding: 10px 12px !important; }
        .brand { grid-column: 1 !important; order: 1 !important; min-width: 0 !important; overflow: hidden !important; }
        .brand-mark { width: 34px !important; height: 34px !important; min-width: 34px !important; }
        .brand-subtitle { display: none !important; }
        .mypage-top-button { grid-column: 2 !important; order: 1 !important; width: 96px !important; min-width: 96px !important; max-width: 96px !important; min-height: 38px !important; padding: 7px 8px !important; white-space: nowrap !important; word-break: keep-all !important; overflow: hidden !important; text-align: center !important; font-size: .78rem !important; }
        .public-nav { grid-column: 1 / -1 !important; order: 2 !important; display: grid !important; grid-template-columns: minmax(116px,1.35fr) repeat(2,minmax(82px,.85fr)) !important; gap: 7px !important; width: 100% !important; overflow: visible !important; }
        .nav-button { min-width: 0 !important; width: 100% !important; min-height: 38px !important; padding: 7px 8px !important; font-size: .82rem !important; }
        .nav-button[data-go="home"] { min-width: 0 !important; min-height: 46px !important; font-size: .92rem !important; }
        .tournament-card, .hero { min-height: 0 !important; }
        .hero { gap: 14px !important; padding: 18px 14px !important; border-radius: 8px !important; background-position: center top !important; }
        .hero h1 { font-size: clamp(2rem,10vw,3rem) !important; line-height: 1.02 !important; }
        .hero p { font-size: .9rem !important; }
        .format-box { grid-template-columns: 1fr !important; gap: 6px !important; padding: 10px !important; }
        .format-box strong { font-size: 1.08rem !important; }
        .entry-cta-panel { grid-template-columns: 1fr !important; padding: 16px !important; border-color: rgba(239,197,109,.42) !important; background: linear-gradient(135deg,rgba(239,197,109,.13),rgba(88,199,255,.07)) !important; }
        .entry-cta-button { width: 100% !important; min-height: 48px !important; }
        .mypage-panel { gap: 10px !important; padding: 10px !important; }
        .profile-primary { padding: 10px !important; }
        .profile-primary h3, .my-lobby-output h3, .my-history-output h3, .my-past-results-output h3 { margin: 0 !important; font-size: 1rem !important; }
        .profile-hero { align-items: center !important; gap: 10px !important; padding: 10px !important; }
        .profile-avatar-wrap { width: 58px !important; height: 58px !important; border-radius: 12px !important; }
        .profile-avatar { border-radius: 12px !important; }
        .profile-hero strong { font-size: 1.14rem !important; }
        .profile-hero em, .profile-hero p { font-size: .72rem !important; }
        .profile-grid, .my-summary { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 7px !important; }
        .profile-grid article, .my-summary article, .past-result-card { padding: 9px !important; gap: 5px !important; }
        .profile-grid span, .my-summary span, .past-result-card span { font-size: .7rem !important; }
        .profile-grid strong, .my-summary strong, .past-result-card strong { font-size: .9rem !important; overflow-wrap: anywhere !important; }
        .mypage-main-grid { display: flex !important; flex-direction: column !important; gap: 10px !important; }
        .mypage-right-stack { order: 1 !important; gap: 10px !important; }
        .mypage-left-stack { order: 2 !important; gap: 10px !important; }
        .next-action-card, .entry-cancel-card, .my-lobby-tournament, .my-lobby-card { padding: 10px !important; }
        .my-lobby-head { grid-template-columns: 1fr !important; }
        .my-lobby-head strong { min-height: 36px !important; font-size: 1.2rem !important; }
        .my-lobby-card li { padding: 8px !important; }
      }
    `;
    document.head.appendChild(css);
    const boot = () => {
      const adminOpenBtn = document.querySelector("#adminOpenBtn");
      if (adminOpenBtn) {
        ensureSystemScreen(adminOpenBtn);
        installAdminGate(adminOpenBtn);
      }
      installAdminUserEditor();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  function ensureSystemScreen(adminOpenBtn) {
    if (!document.querySelector("[data-go='system']")) {
      const nav = document.querySelector(".public-nav");
      const report = document.querySelector("#reportNavBtn");
      const btn = document.createElement("button");
      btn.className = "nav-button";
      btn.type = "button";
      btn.dataset.go = "system";
      btn.textContent = "システム";
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        openSystemScreen();
      });
      nav?.insertBefore(btn, report || null);
    }
    if (document.querySelector("#system")) {
      if (!document.querySelector("#ownerSystemMount")) document.querySelector(".owner-system-card")?.insertAdjacentHTML("beforeend", '<div id="ownerSystemMount"></div>');
      return;
    }
    const system = document.createElement("section");
    system.id = "system";
    system.className = "screen";
    system.innerHTML = `<div class="page-heading"><p class="eyebrow">System</p><h2>システム</h2><p>利用規約、運営ポリシー、アカウント保守、開設者向けの操作をまとめています。</p></div><section class="panel system-panel"><details class="system-card"><summary>利用規約・大会参加ルール</summary><ul><li>チェックイン後の途中辞退、無断欠席、進行を妨げる行為は禁止です。</li><li>八百長、ウィントレード、談合、順位操作、外部連絡による不正な協力は禁止です。</li><li>運営からの案内、テーブル作成依頼、結果報告の指示には速やかに対応してください。</li></ul></details><details class="system-card"><summary>アカウント保守</summary><p>メールアドレス連携とパスワード変更は、後からマイページのアカウント情報へ追加する想定です。</p></details><details class="system-card owner-system-card"><summary>開設者オプション</summary><p>大会作成、削除、進行補助などの管理操作は開設者のみ使用します。</p><div id="ownerSystemMount"></div></details></section>`;
    document.querySelector("main")?.insertBefore(system, adminOpenBtn.closest(".screen") || null);
  }

  function openSystemScreen() {
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === "system"));
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === "system"));
    if (location.hash !== "#system") location.hash = "system";
  }

  function installAdminGate(adminOpenBtn) {
    if (document.querySelector("#ownerOptionsBtn")) return;
    const ownerMount = document.querySelector("#ownerSystemMount");
    if (!ownerMount) return;
    const ownerOptionsBtn = document.createElement("button");
    ownerOptionsBtn.id = "ownerOptionsBtn";
    ownerOptionsBtn.className = "secondary-button owner-options-text";
    ownerOptionsBtn.type = "button";
    ownerOptionsBtn.setAttribute("aria-label", "開設者オプション");
    ownerOptionsBtn.title = "開設者オプション";
    ownerOptionsBtn.textContent = "管理画面を開く";
    adminOpenBtn.classList.add("hidden");
    ownerMount.appendChild(ownerOptionsBtn);
    ownerOptionsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      adminOpenBtn.click();
    });

    const adminLoginBtn = document.querySelector("#adminLoginBtn");
    const adminPin = document.querySelector("#adminPin");
    const adminLock = document.querySelector("#adminLock");
    const adminConsole = document.querySelector("#adminConsole");
    if (adminPin) adminPin.placeholder = "管理PIN";
    adminLoginBtn?.addEventListener("click", (event) => {
      event.stopImmediatePropagation();
      if (adminPin?.value !== ADMIN_PIN) return;
      adminLock?.classList.add("hidden");
      adminConsole?.classList.remove("hidden");
    }, true);
  }

  function installAdminUserEditor() {
    const boot = () => {
      const table = document.querySelector("#playersTable");
      if (!table || table.dataset.adminEditor === "1") return;
      table.dataset.adminEditor = "1";
      new MutationObserver(() => renderEditableRows(table)).observe(table, { childList: true, subtree: true });
      table.addEventListener("change", (event) => {
        const input = event.target.closest(".admin-player-input");
        if (input) saveAdminPlayerField(input.dataset.id, input.dataset.field, input.value);
      });
      renderEditableRows(table);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    setTimeout(boot, 1000);
  }

  function renderEditableRows(table) {
    [...table.querySelectorAll("tr")].forEach((row) => {
      if (row.dataset.adminEditable === "1") return;
      const id = row.querySelector("[data-id]")?.dataset.id;
      if (!id) return;
      const player = currentStoredPlayers().find((item) => item.id === id);
      if (!player) return;
      let cells = row.querySelectorAll("td");
      if (cells.length < 6) return;
      if (cells.length === 6) {
        cells[5].insertAdjacentElement("beforebegin", document.createElement("td"));
        cells = row.querySelectorAll("td");
      }
      ["displayName", "riotId", "discordId", "xAccount", "accountEmail"].forEach((field, index) => {
        const type = field === "accountEmail" ? "email" : "text";
        cells[index + 1].innerHTML = `<input class="admin-player-input" type="${type}" data-id="${escapeAttr(id)}" data-field="${field}" value="${escapeAttr(player[field] || "")}" />`;
      });
      row.dataset.adminEditable = "1";
    });
  }

  function currentStoredPlayers() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const active = data.tournaments?.find((tournament) => tournament.id === data.activeTournamentId);
      return active?.players || data.players || [];
    } catch {
      return [];
    }
  }

  function saveAdminPlayerField(id, field, value) {
    if (!["displayName", "riotId", "discordId", "xAccount", "accountEmail"].includes(field)) return;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const active = data.tournaments?.find((tournament) => tournament.id === data.activeTournamentId);
      const previous = { ...(active?.players || data.players || []).find((player) => player.id === id) };
      updatePlayerList(data.players, id, field, value);
      if (active) updatePlayerList(active.players, id, field, value);
      const json = JSON.stringify(data);
      originalSetItem(STORAGE_KEY, json);
      scheduleSave(json);
      syncAccountProfiles(previous, { ...previous, [field]: String(value || "").trim() });
    } catch (error) {
      console.warn("TFTRise admin user save failed:", error);
    }
  }

  function updatePlayerList(players, id, field, value) {
    if (!Array.isArray(players)) return;
    const player = players.find((item) => item.id === id);
    if (player) player[field] = String(value || "").trim();
  }

  function syncAccountProfiles(previous, updated) {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
      Object.keys(accounts).forEach((key) => {
        if (profileMatches(accounts[key]?.profile, previous)) accounts[key].profile = { ...(accounts[key].profile || {}), ...updated };
      });
      originalSetItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      const current = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (profileMatches(current, previous)) originalSetItem(PROFILE_KEY, JSON.stringify({ ...current, ...updated }));
    } catch {}
  }

  function profileMatches(profile, player) {
    if (!profile || !player) return false;
    return ["riotId", "discordId", "displayName", "accountEmail"].some((key) => normalizeLoose(profile[key]) && normalizeLoose(profile[key]) === normalizeLoose(player[key]));
  }

  function normalizeLoose(value) {
    return String(value || "").toLowerCase().normalize("NFKC").replace(/[#].*$/, " ").trim().replace(/[^a-z0-9@\._-]/g, "");
  }

  function escapeAttr(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }
})();
