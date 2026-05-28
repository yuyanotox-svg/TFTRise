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
        display: inline-grid;
        align-items: center;
        justify-items: center;
      }

      .owner-options {
        width: 32px;
        min-width: 32px;
        min-height: 32px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.025);
        color: rgba(223, 245, 255, 0.42);
        border-radius: 6px;
        padding: 0;
        font-weight: 800;
        font-size: 0.9rem;
        line-height: 1;
        cursor: pointer;
        box-shadow: none;
      }

      .owner-options:hover {
        border-color: rgba(88, 199, 255, 0.35);
        color: #58c7ff;
        background: rgba(88, 199, 255, 0.08);
      }

      .owner-menu .admin-open {
        display: none !important;
      }

      @media (max-width: 640px) {
        .owner-menu {
          grid-column: 2 / 4;
          justify-self: end;
        }

        .owner-options {
          width: 30px !important;
          min-width: 30px !important;
          min-height: 30px !important;
          padding: 0 !important;
          font-size: 0.85rem !important;
        }

        .mypage-panel {
          gap: 10px !important;
          padding: 10px !important;
        }

        .profile-primary {
          padding: 10px !important;
        }

        .profile-primary h3,
        .my-lobby-output h3,
        .my-history-output h3,
        .my-past-results-output h3 {
          margin: 0 !important;
          font-size: 1rem !important;
        }

        .profile-hero {
          align-items: center !important;
          gap: 10px !important;
          padding: 10px !important;
        }

        .profile-avatar-wrap {
          width: 58px !important;
          height: 58px !important;
          border-radius: 12px !important;
        }

        .profile-avatar {
          border-radius: 12px !important;
        }

        .profile-hero strong {
          font-size: 1.14rem !important;
        }

        .profile-hero em,
        .profile-hero p {
          font-size: 0.72rem !important;
        }

        .profile-grid,
        .my-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 7px !important;
        }

        .profile-grid article,
        .my-summary article,
        .past-result-card {
          padding: 9px !important;
          gap: 5px !important;
        }

        .profile-grid span,
        .my-summary span,
        .past-result-card span {
          font-size: 0.7rem !important;
        }

        .profile-grid strong,
        .my-summary strong,
        .past-result-card strong {
          font-size: 0.9rem !important;
          overflow-wrap: anywhere !important;
        }

        .mypage-main-grid {
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
        }

        .mypage-right-stack {
          order: 1 !important;
          gap: 10px !important;
        }

        .mypage-left-stack {
          order: 2 !important;
          gap: 10px !important;
        }

        .next-action-card,
        .entry-cancel-card,
        .my-lobby-tournament,
        .my-lobby-card {
          padding: 10px !important;
        }

        .my-lobby-head {
          grid-template-columns: 1fr !important;
        }

        .my-lobby-head strong {
          min-height: 36px !important;
          font-size: 1.2rem !important;
        }

        .my-lobby-card li {
          padding: 8px !important;
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
      ownerOptionsBtn.setAttribute("aria-label", "開設者オプション");
      ownerOptionsBtn.title = "開設者オプション";
      ownerOptionsBtn.textContent = "•••";

      adminOpenBtn.classList.add("hidden");
      adminOpenBtn.parentNode.insertBefore(ownerMenu, adminOpenBtn);
      ownerMenu.appendChild(ownerOptionsBtn);
      ownerMenu.appendChild(adminOpenBtn);

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
})();
