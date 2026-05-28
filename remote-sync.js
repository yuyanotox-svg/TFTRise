(function () {
  const STORAGE_KEY = "tft-space-gods-cup";
  const REMOTE_STATE_ID = "tftrise-main";
  const HYDRATED_KEY = "tftrise-remote-hydrated";
  let supabaseClient = null;
  let saveTimer = null;
  let lastSaved = "";
  const originalSetItem = localStorage.setItem.bind(localStorage);

  installOwnerOptions();

  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (key === STORAGE_KEY) scheduleSave(value);
  };

  initRemoteSync().catch((error) => {
    console.warn("TFTRise remote sync disabled:", error);
  });

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
    const { data, error } = await supabaseClient
      .from("app_state")
      .select("data")
      .eq("id", REMOTE_STATE_ID)
      .maybeSingle();
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
    saveTimer = setTimeout(() => {
      saveRemoteState(value).catch((error) => console.warn("TFTRise remote save failed:", error));
    }, 700);
  }

  async function saveRemoteState(value) {
    if (!supabaseClient || !value || value === lastSaved) return;
    const parsed = JSON.parse(value);
    const { error } = await supabaseClient
      .from("app_state")
      .upsert({
        id: REMOTE_STATE_ID,
        data: parsed,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    lastSaved = value;
  }

  function installOwnerOptions() {
    const ADMIN_PIN = "Yuuya1228";
    const css = document.createElement("style");
    css.textContent = `
      #adminOpenBtn { display: none !important; }
      .owner-options-text { width: 100%; justify-content: center; }
      .system-panel { display: grid; gap: 12px; max-width: 920px; }
      .system-card { border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 12px; background: rgba(255,255,255,.035); }
      .system-card summary { cursor: pointer; color: #f7fbff; font-weight: 900; }
      .system-card p, .system-card li { color: #aab7cb; line-height: 1.75; }
      .system-card ul { margin: 10px 0 0; padding-left: 18px; }
      .owner-system-card { max-width: 360px; }
      @media (max-width: 640px) {
        .mypage-panel { gap: 10px !important; padding: 10px !important; }
        .profile-primary { padding: 10px !important; }
        .profile-primary h3, .my-lobby-output h3, .my-history-output h3, .my-past-results-output h3 { margin: 0 !important; font-size: 1rem !important; }
        .profile-hero { align-items: center !important; gap: 10px !important; padding: 10px !important; }
        .profile-avatar-wrap { width: 58px !important; height: 58px !important; border-radius: 12px !important; }
        .profile-avatar { border-radius: 12px !important; }
        .profile-hero strong { font-size: 1.14rem !important; }
        .profile-hero em, .profile-hero p { font-size: .72rem !important; }
        .profile-grid, .my-summary { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 7px !important; }
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

    const enhance = () => {
      const adminOpenBtn = document.querySelector("#adminOpenBtn");
      if (!adminOpenBtn) return;
      ensureSystemScreen(adminOpenBtn);
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
      adminLoginBtn?.addEventListener(
        "click",
        (event) => {
          event.stopImmediatePropagation();
          if (adminPin?.value !== ADMIN_PIN) return;
          adminLock?.classList.add("hidden");
          adminConsole?.classList.remove("hidden");
        },
        true
      );
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", enhance);
    } else {
      enhance();
    }
  }

  function ensureSystemScreen(adminOpenBtn) {
    if (!document.querySelector("[data-go='system']")) {
      const nav = document.querySelector(".public-nav");
      const reportButton = document.querySelector("#reportNavBtn");
      const systemButton = document.createElement("button");
      systemButton.className = "nav-button";
      systemButton.type = "button";
      systemButton.dataset.go = "system";
      systemButton.textContent = "システム";
      systemButton.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === "system"));
        document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === "system"));
        if (location.hash !== "#system") location.hash = "system";
      });
      nav?.insertBefore(systemButton, reportButton || null);
    }

    if (!document.querySelector("#system")) {
      const system = document.createElement("section");
      system.id = "system";
      system.className = "screen";
      system.innerHTML = `
        <div class="page-heading">
          <p class="eyebrow">System</p>
          <h2>システム</h2>
          <p>利用規約、運営ポリシー、アカウント保守、開設者向けの操作をまとめています。</p>
        </div>
        <section class="panel system-panel">
          <details open class="system-card">
            <summary>利用規約・大会参加ルール</summary>
            <ul>
              <li>チェックイン後の途中辞退、無断欠席、進行を妨げる行為は禁止です。</li>
              <li>八百長、ウィントレード、談合、順位操作、外部連絡による不正な協力は禁止です。</li>
              <li>運営からの案内、テーブル作成依頼、結果報告の指示には速やかに対応してください。</li>
            </ul>
          </details>
          <details class="system-card">
            <summary>アカウント保守</summary>
            <p>メールアドレス連携とパスワード変更はマイページのアカウント情報から編集できます。</p>
          </details>
          <details class="system-card owner-system-card">
            <summary>開設者オプション</summary>
            <p>大会作成、削除、進行補助などの管理操作は開設者のみ使用します。</p>
            <div id="ownerSystemMount"></div>
          </details>
        </section>
      `;
      document.querySelector("main")?.insertBefore(system, adminOpenBtn.closest(".screen") || null);
    } else if (!document.querySelector("#ownerSystemMount")) {
      const details = document.querySelector(".owner-system-card");
      details?.insertAdjacentHTML("beforeend", `<div id="ownerSystemMount"></div>`);
    }
  }
})();
