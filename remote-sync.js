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
      .owner-menu {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .owner-options {
        border: 1px solid rgba(91, 209, 255, 0.42);
        background: rgba(11, 34, 57, 0.82);
        color: #dff5ff;
        border-radius: 8px;
        min-height: 40px;
        padding: 10px 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 0 22px rgba(91, 209, 255, 0.12);
      }

      .owner-menu .admin-open {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 80;
        white-space: nowrap;
      }

      .owner-menu .admin-open.hidden {
        display: none !important;
      }

      @media (max-width: 640px) {
        .owner-menu {
          grid-column: 2 / 4;
          justify-self: end;
          gap: 6px;
        }

        .owner-options,
        .owner-menu .admin-open {
          min-height: 34px !important;
          padding: 7px 9px !important;
          font-size: 0.76rem !important;
        }
      }
    `;
    document.head.appendChild(css);

    const enhance = () => {
      const adminOpenBtn = document.querySelector("#adminOpenBtn");
      if (!adminOpenBtn || document.querySelector("#ownerOptionsBtn")) return;

      const ownerMenu = document.createElement("div");
      ownerMenu.className = "owner-menu";
      const ownerOptionsBtn = document.createElement("button");
      ownerOptionsBtn.id = "ownerOptionsBtn";
      ownerOptionsBtn.className = "owner-options";
      ownerOptionsBtn.type = "button";
      ownerOptionsBtn.textContent = "開設者オプション";

      adminOpenBtn.classList.add("hidden");
      adminOpenBtn.parentNode.insertBefore(ownerMenu, adminOpenBtn);
      ownerMenu.appendChild(ownerOptionsBtn);
      ownerMenu.appendChild(adminOpenBtn);

      ownerOptionsBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        adminOpenBtn.classList.toggle("hidden");
      });

      document.addEventListener("click", (event) => {
        if (event.target.closest(".owner-menu")) return;
        adminOpenBtn.classList.add("hidden");
      });

      const adminLoginBtn = document.querySelector("#adminLoginBtn");
      const adminPin = document.querySelector("#adminPin");
      const adminLock = document.querySelector("#adminLock");
      const adminConsole = document.querySelector("#adminConsole");
      if (adminPin) adminPin.placeholder = "管理PIN";
      adminLoginBtn?.addEventListener(
        "click",
        (event) => {
          if (adminPin?.value !== ADMIN_PIN) return;
          event.stopImmediatePropagation();
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
})();
