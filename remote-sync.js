(function () {
  const STORAGE_KEY = "tft-space-gods-cup";
  const REMOTE_STATE_ID = "tftrise-main";
  const HYDRATED_KEY = "tftrise-remote-hydrated";
  let supabaseClient = null;
  let saveTimer = null;
  let lastSaved = "";
  const originalSetItem = localStorage.setItem.bind(localStorage);

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
})();
