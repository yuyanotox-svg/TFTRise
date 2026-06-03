(function () {
  const STORAGE_KEY = "tft-space-gods-cup";
  const REMOTE_STATE_ID = "tftrise-main";
  const HYDRATED_KEY = "tftrise-remote-hydrated";
  const ACCOUNTS_KEY = "tftrise-accounts";
  const PROFILE_KEY = "tftrise-profile";
  const REMOTE_ACCOUNTS_KEY = "__tftriseAccounts";
  let remoteReady = false;
  let saveTimer = null;
  let lastSaved = "";
  const originalSetItem = localStorage.setItem.bind(localStorage);

  installSystemEnhancements();

  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (key === STORAGE_KEY || key === ACCOUNTS_KEY) scheduleSave();
    if (key === STORAGE_KEY) setTimeout(installRecordsEnhancements, 0);
  };

  initRemoteSync().catch((error) => {
    console.warn("TFTRise remote sync disabled:", error);
  });

  async function initRemoteSync() {
    remoteReady = true;
    await hydrateFromRemote();
    scheduleSave();
    setInterval(() => {
      hydrateFromRemote().catch((error) => console.warn("TFTRise remote refresh failed:", error));
    }, 15000);
  }

  async function hydrateFromRemote() {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Remote state read failed");
    const result = await response.json();
    if (!result?.data) return;
    const remoteBundle = readLocalBundleFromRemote(result.data);
    const localBundle = readLocalBundle();
    const mergedBundle = mergeBundles(remoteBundle, localBundle);
    const remoteJson = JSON.stringify(remoteBundle);
    const mergedJson = JSON.stringify(mergedBundle);
    const mergedStateJson = JSON.stringify(stripRemoteAccounts(mergedBundle));
    const mergedAccountsJson = JSON.stringify(mergedBundle[REMOTE_ACCOUNTS_KEY] || {});
    const localJson = JSON.stringify(localBundle);
    const localStateJson = localStorage.getItem(STORAGE_KEY) || "";
    const localAccountsJson = localStorage.getItem(ACCOUNTS_KEY) || "{}";
    lastSaved = remoteJson;
    if (mergedJson && mergedJson !== localJson && sessionStorage.getItem(HYDRATED_KEY) !== mergedJson) {
      sessionStorage.setItem(HYDRATED_KEY, mergedJson);
      if (mergedStateJson !== localStateJson) originalSetItem(STORAGE_KEY, mergedStateJson);
      if (mergedAccountsJson !== localAccountsJson) originalSetItem(ACCOUNTS_KEY, mergedAccountsJson);
      location.reload();
    }
  }

  function scheduleSave() {
    if (!remoteReady) return;
    const value = JSON.stringify(readLocalBundle());
    if (!value || value === lastSaved) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveRemoteState().catch((error) => console.warn("TFTRise remote save failed:", error));
    }, 700);
  }

  async function saveRemoteState() {
    const value = JSON.stringify(await readMergedRemoteBundle());
    if (!remoteReady || !value || value === lastSaved) return;
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: JSON.parse(value) }),
    });
    if (!response.ok) throw new Error("Remote state write failed");
    lastSaved = value;
  }

  async function readMergedRemoteBundle() {
    const localBundle = readLocalBundle();
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) return localBundle;
      const result = await response.json();
      if (!result?.data) return localBundle;
      return mergeBundles(readLocalBundleFromRemote(result.data), localBundle);
    } catch {
      return localBundle;
    }
  }

  function mergeBundles(remoteBundle, localBundle) {
    const remoteState = stripRemoteAccounts(remoteBundle || {});
    const localState = stripRemoteAccounts(localBundle || {});
    const merged = mergeState(remoteState, localState);
    merged[REMOTE_ACCOUNTS_KEY] = {
      ...(remoteBundle?.[REMOTE_ACCOUNTS_KEY] || {}),
      ...(localBundle?.[REMOTE_ACCOUNTS_KEY] || {}),
    };
    return merged;
  }

  function mergeState(remoteState, localState) {
    const deletedTournaments = mergeDeletedTournaments(remoteState?.deletedTournaments, localState?.deletedTournaments);
    if (!remoteState?.tournament && !remoteState?.tournaments?.length) return { ...(localState || {}), deletedTournaments };
    if (!localState?.tournament && !localState?.tournaments?.length) return filterDeletedState({ ...(remoteState || {}), deletedTournaments });

    const merged = { ...remoteState };
    merged.deletedTournaments = deletedTournaments;
    const tournamentMap = new Map();
    collectTournamentSnapshots(remoteState).forEach((snapshot) => tournamentMap.set(snapshot.id, snapshot));
    collectTournamentSnapshots(localState).forEach((snapshot) => {
      const previous = tournamentMap.get(snapshot.id);
      tournamentMap.set(snapshot.id, previous ? mergeTournamentSnapshot(previous, snapshot) : snapshot);
    });

    Object.keys(deletedTournaments).forEach((id) => tournamentMap.delete(id));
    merged.tournaments = [...tournamentMap.values()];
    const activeId = chooseActiveTournamentId(remoteState, localState, merged.tournaments);
    const active = tournamentMap.get(activeId) || merged.tournaments[0];
    merged.activeTournamentId = active?.id || "";
    if (active) {
      merged.tournament = active.tournament || null;
      merged.players = active.players || [];
      merged.lobbies = active.lobbies || [];
      merged.lobbyHosts = active.lobbyHosts || [];
      merged.results = active.results || {};
      merged.reports = active.reports || [];
    }
    if (!active) {
      merged.activeTournamentId = "";
      merged.tournament = null;
      merged.players = [];
      merged.lobbies = [];
      merged.lobbyHosts = [];
      merged.results = {};
      merged.reports = [];
    }
    return merged;
  }

  function mergeDeletedTournaments(remoteDeleted = {}, localDeleted = {}) {
    const merged = { ...(remoteDeleted || {}) };
    Object.entries(localDeleted || {}).forEach(([id, deletedAt]) => {
      if (!id) return;
      if (!merged[id] || String(deletedAt || "") > String(merged[id] || "")) merged[id] = deletedAt || new Date().toISOString();
    });
    return merged;
  }

  function filterDeletedState(stateValue) {
    const deleted = stateValue?.deletedTournaments || {};
    const filtered = { ...(stateValue || {}), deletedTournaments: deleted };
    filtered.tournaments = (filtered.tournaments || []).filter((item) => !deleted[item.id]);
    if (filtered.tournament?.id && deleted[filtered.tournament.id]) {
      filtered.activeTournamentId = "";
      filtered.tournament = null;
      filtered.players = [];
      filtered.lobbies = [];
      filtered.lobbyHosts = [];
      filtered.results = {};
      filtered.reports = [];
    }
    return filtered;
  }

  function chooseActiveTournamentId(remoteState, localState, tournaments) {
    const items = Array.isArray(tournaments) ? tournaments : [];
    if (!items.length) return "";
    const remoteActiveId = remoteState?.activeTournamentId || "";
    const localActiveId = localState?.activeTournamentId || "";
    const ranked = items
      .map((item) => ({
        id: item.id,
        score: tournamentActivityScore(item, {
          isRemoteActive: item.id === remoteActiveId,
          isLocalActive: item.id === localActiveId,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.id || items[0]?.id || "";
  }

  function tournamentActivityScore(item, flags = {}) {
    const tournament = item?.tournament || {};
    const statusRank = { entry: 1, checkin: 4, ready: 5, live: 6, finished: 0 };
    const status = tournament.status === "upcoming" ? "entry" : tournament.status || "entry";
    const players = Array.isArray(item?.players) ? item.players.length : 0;
    const checkedIn = Array.isArray(item?.players) ? item.players.filter((player) => player.checkedInAt).length : 0;
    const lobbyCount = countNestedEntries(item?.lobbies || []);
    let score = 0;
    if (flags.isRemoteActive) score += 20;
    if (flags.isLocalActive) score += 8;
    if (tournament.startAt) score += 120;
    if (statusRank[status]) score += statusRank[status] * 20;
    score += Math.min(players, 256);
    score += Math.min(checkedIn, 256) * 2;
    score += Math.min(lobbyCount, 256) * 3;
    if (!tournament.startAt && status === "entry" && !lobbyCount) score -= 80;
    return score;
  }

  function collectTournamentSnapshots(stateValue) {
    const snapshots = [];
    (stateValue?.tournaments || []).forEach((item) => {
      if (stateValue?.deletedTournaments?.[item?.id]) return;
      if (item?.id) snapshots.push(normalizeSnapshot(item));
    });
    if (stateValue?.tournament) {
      const activeId = stateValue.tournament.id || stateValue.activeTournamentId || "main";
      if (stateValue?.deletedTournaments?.[activeId]) return snapshots;
      snapshots.push(normalizeSnapshot({
        id: activeId,
        tournament: stateValue.tournament,
        players: stateValue.players || [],
        lobbies: stateValue.lobbies || [],
        lobbyHosts: stateValue.lobbyHosts || [],
        results: stateValue.results || {},
        reports: stateValue.reports || [],
      }));
    }
    return snapshots;
  }

  function normalizeSnapshot(snapshot) {
    const id = snapshot.id || snapshot.tournament?.id || "main";
    return {
      id,
      tournament: { ...(snapshot.tournament || {}), id },
      players: Array.isArray(snapshot.players) ? snapshot.players : [],
      lobbies: Array.isArray(snapshot.lobbies) ? snapshot.lobbies : [],
      lobbyHosts: Array.isArray(snapshot.lobbyHosts) ? snapshot.lobbyHosts : [],
      results: snapshot.results || {},
      reports: Array.isArray(snapshot.reports) ? snapshot.reports : [],
    };
  }

  function mergeTournamentSnapshot(remoteSnapshot, localSnapshot) {
    const remote = normalizeSnapshot(remoteSnapshot);
    const local = normalizeSnapshot(localSnapshot);
    return sanitizeSnapshot({
      id: remote.id || local.id,
      tournament: mergeTournamentMeta(remote.tournament, local.tournament),
      players: mergePlayers(remote.players, local.players),
      lobbies: mergeLobbyBlocks(remote.lobbies, local.lobbies),
      lobbyHosts: mergeLobbyBlocks(remote.lobbyHosts, local.lobbyHosts),
      results: mergeResults(remote.results, local.results),
      reports: mergeReports(remote.reports, local.reports),
    });
  }

  function mergeTournamentMeta(remoteTournament, localTournament) {
    const remote = remoteTournament || {};
    const local = localTournament || {};
    const merged = { ...local, ...remote };
    ["id", "name", "startAt", "status", "formatType", "maxPlayers", "lobbyRule", "stages", "contactLabel", "contactUrl"].forEach((key) => {
      if ((remote[key] === undefined || remote[key] === "" || remote[key] === null) && local[key] !== undefined) merged[key] = local[key];
    });
    merged.status = strongestTournamentStatus(remote.status, local.status, automatedTournamentStatus(merged));
    if (!merged.checkInFinalizedAt && local.checkInFinalizedAt) merged.checkInFinalizedAt = local.checkInFinalizedAt;
    if (!merged.checkInFinalizedAt && remote.checkInFinalizedAt) merged.checkInFinalizedAt = remote.checkInFinalizedAt;
    return merged;
  }

  function sanitizeSnapshot(snapshot) {
    const status = snapshot.tournament?.status || "entry";
    if (["entry", "checkin"].includes(status)) {
      delete snapshot.tournament.checkInFinalizedAt;
      snapshot.players = (snapshot.players || []).map((player) => {
        if (player.checkedInAt) return player;
        return { ...player, didNotCheckIn: false, isSubstitute: false };
      });
      snapshot.lobbies = [];
      snapshot.lobbyHosts = [];
      snapshot.results = {};
      snapshot.reports = [];
    }
    return snapshot;
  }

  function automatedTournamentStatus(tournament) {
    if (!tournament) return "entry";
    const current = tournament.status === "upcoming" ? "entry" : tournament.status || "entry";
    if (current === "live" || current === "finished") return current;
    if (!tournament.startAt) return current === "ready" ? "ready" : "entry";
    const start = new Date(tournament.startAt).getTime();
    if (!Number.isFinite(start)) return current;
    const now = Date.now();
    const checkInOpen = start - 30 * 60 * 1000;
    if (now < checkInOpen) return "entry";
    if (now <= start) return "checkin";
    return "ready";
  }

  function strongestTournamentStatus(...statuses) {
    const rank = { entry: 1, checkin: 2, ready: 3, live: 4, finished: 5 };
    return statuses
      .map((status) => status === "upcoming" ? "entry" : status)
      .filter((status) => rank[status])
      .sort((a, b) => rank[b] - rank[a])[0] || "entry";
  }

  function mergeLobbyBlocks(remoteBlocks, localBlocks) {
    const maxLength = Math.max(remoteBlocks?.length || 0, localBlocks?.length || 0);
    const merged = [];
    for (let index = 0; index < maxLength; index += 1) {
      const remoteBlock = Array.isArray(remoteBlocks?.[index]) ? remoteBlocks[index] : [];
      const localBlock = Array.isArray(localBlocks?.[index]) ? localBlocks[index] : [];
      merged[index] = richerLobbyBlock(remoteBlock, localBlock);
    }
    return merged;
  }

  function richerLobbyBlock(remoteBlock, localBlock) {
    if (!remoteBlock.length) return localBlock;
    if (!localBlock.length) return remoteBlock;
    const remoteCount = countNestedEntries(remoteBlock);
    const localCount = countNestedEntries(localBlock);
    if (localBlock.length > remoteBlock.length) return localBlock;
    if (remoteBlock.length > localBlock.length) return remoteBlock;
    return localCount >= remoteCount ? localBlock : remoteBlock;
  }

  function countNestedEntries(value) {
    if (!Array.isArray(value)) return value ? 1 : 0;
    return value.reduce((sum, item) => sum + countNestedEntries(item), 0);
  }

  function mergePlayers(remotePlayers, localPlayers) {
    const map = new Map();
    [...(remotePlayers || []), ...(localPlayers || [])].forEach((player) => {
      if (!player) return;
      const key = playerMergeKey(player);
      const previous = map.get(key) || {};
      map.set(key, { ...previous, ...player, id: previous.id || player.id });
    });
    return [...map.values()];
  }

  function playerMergeKey(player) {
    return normalizeKey(player.riotId) || normalizeKey(player.discordId) || normalizeKey(player.displayName) || String(player.id || "");
  }

  function mergeResults(remoteResults, localResults) {
    const merged = { ...(remoteResults || {}) };
    Object.entries(localResults || {}).forEach(([gameNo, placements]) => {
      merged[gameNo] = { ...(merged[gameNo] || {}), ...(placements || {}) };
    });
    return merged;
  }

  function mergeReports(remoteReports, localReports) {
    const map = new Map();
    [...(remoteReports || []), ...(localReports || [])].forEach((report) => {
      if (!report) return;
      map.set(report.id || `${report.createdAt}-${report.submitterId}-${report.game}-${report.lobby}`, report);
    });
    return [...map.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().normalize("NFKC").replace(/[#＃].*$/, "").replace(/[^a-z0-9@\._-]/g, "");
  }

  function readLocalBundle() {
    const state = safeParse(localStorage.getItem(STORAGE_KEY) || "{}");
    const accounts = safeParse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    return readLocalBundleFromRemote({ ...state, [REMOTE_ACCOUNTS_KEY]: accounts });
  }

  function readLocalBundleFromRemote(data) {
    return { ...stripRemoteAccounts(data || {}), [REMOTE_ACCOUNTS_KEY]: data?.[REMOTE_ACCOUNTS_KEY] || {} };
  }

  function stripRemoteAccounts(data) {
    const state = { ...(data || {}) };
    delete state[REMOTE_ACCOUNTS_KEY];
    return state;
  }

  function safeParse(value) {
    try {
      return JSON.parse(value || "{}");
    } catch {
      return {};
    }
  }

  function installSystemEnhancements() {
    const css = document.createElement("style");
    css.textContent = `
      #adminOpenBtn { display: none !important; }
      .public-nav { align-items: center !important; }
      .nav-button { min-width: 118px !important; min-height: 48px !important; }
      .nav-button[data-go="home"] {
        min-width: 154px !important;
        min-height: 54px !important;
        border-color: rgba(239, 197, 109, .76) !important;
        color: #160d05 !important;
        background: linear-gradient(180deg, #ffe28f, #e5a93e) !important;
        box-shadow: 0 14px 30px rgba(239, 197, 109, .18) !important;
        font-size: 1rem !important;
      }
      .nav-button[data-go="home"].active,
      .nav-button[data-go="home"]:hover {
        color: #160d05 !important;
        background: linear-gradient(180deg, #fff0b4, #f0bd52) !important;
      }
      .owner-options-text { width: 100%; justify-content: center; }
      .system-panel { display: grid; gap: 12px; max-width: 920px; }
      .system-card { border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 12px; background: rgba(255,255,255,.035); }
      .system-card:not([open]) { background: rgba(255,255,255,.025) !important; }
      .system-card[open] { border-color: rgba(88,199,255,.22) !important; }
      .system-card summary { cursor: pointer; color: #f7fbff; font-weight: 900; }
      .system-card p, .system-card li { color: #aab7cb; line-height: 1.75; }
      .system-card ul { margin: 10px 0 0; padding-left: 18px; }
      .owner-system-card { max-width: 360px; }
      .admin-player-input {
        width: min(190px, 100%);
        min-height: 34px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 6px;
        padding: 7px 9px;
        color: #f7fbff;
        background: rgba(5,10,22,.72);
        font: inherit;
      }
      .records-dashboard{display:grid;gap:14px}.records-title,.archive-section-head,.records-board-head,.reward-detail-head{display:flex;gap:12px;align-items:end;justify-content:space-between}.records-title h3,.archive-section-head h3{color:#f7fbff;font-size:clamp(1.35rem,3vw,2rem)}.records-title>span{border:1px solid rgba(239,197,109,.34);border-radius:999px;padding:7px 12px;color:#efc56d;background:rgba(239,197,109,.08);font-weight:900}.records-leaderboards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.records-board{display:grid;gap:10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:12px;background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(231,248,255,.9));box-shadow:0 18px 46px rgba(0,0,0,.18)}.records-board-head{align-items:start}.records-board-head span{color:#667085;font-size:.76rem;font-weight:800}.records-board-head strong{color:#172033;font-size:1.08rem}.records-board-list{display:grid;gap:7px}.records-player-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:38px;border:1px solid rgba(23,32,51,.08);border-radius:8px;padding:6px 8px;background:rgba(255,255,255,.7)}.records-player-row.is-current{border-color:rgba(239,197,109,.7);background:linear-gradient(90deg,#fff2bd,#e7f8ff)}.records-player-row b{display:grid;place-items:center;width:24px;height:24px;border-radius:999px;color:#101828;background:rgba(239,197,109,.42)}.records-player-row span{overflow:hidden;color:#172033;text-overflow:ellipsis;white-space:nowrap;font-weight:900}.records-player-row strong{color:#b71f3a}.reward-policy-strip,.reward-detail-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.reward-policy-strip article,.reward-detail-grid article{display:grid;gap:4px;border:1px solid rgba(239,197,109,.22);border-radius:8px;padding:10px;background:rgba(239,197,109,.08)}.reward-policy-strip span,.reward-detail-grid span,.reward-policy-strip small,.reward-detail-grid small{color:#b8b1c6;font-size:.76rem}.reward-policy-strip strong,.reward-detail-grid strong{color:#efc56d;font-size:1.1rem}.tournament-reward-detail{display:grid;gap:10px;border:1px solid rgba(239,197,109,.24);border-radius:8px;padding:12px;background:rgba(239,197,109,.055)}.reward-detail-head{align-items:start;flex-direction:column}.reward-detail-head span{color:#efc56d;font-size:.76rem;font-weight:900;text-transform:uppercase}.reward-detail-head strong{color:#fff4dc;font-size:1.1rem}.reward-detail-head p{color:#b8b1c6}
      @media (max-width: 640px) {
        .site-header {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 8px !important;
        }
        .brand {
          grid-column: 1 !important;
          order: 1 !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }
        .mypage-top-button {
          display: none !important;
        }
        .public-nav {
          display: none !important;
        }
        .nav-button {
          min-width: 0 !important;
          width: 100% !important;
          min-height: 38px !important;
          padding: 7px 8px !important;
        }
        .nav-button[data-go="home"] {
          min-width: 0 !important;
          min-height: 46px !important;
          font-size: .92rem !important;
        }
        .tournament-card, .hero { min-height: 0 !important; }
        .hero {
          gap: 14px !important;
          padding: 18px 14px !important;
          border-radius: 8px !important;
          background-position: center top !important;
        }
        .hero h1 {
          font-size: clamp(2rem, 10vw, 3rem) !important;
          line-height: 1.02 !important;
        }
        .hero p { font-size: .9rem !important; }
        .format-box {
          grid-template-columns: 1fr !important;
          gap: 6px !important;
          padding: 10px !important;
        }
        .format-box strong { font-size: 1.08rem !important; }
        .entry-cta-panel {
          grid-template-columns: 1fr !important;
          padding: 16px !important;
          border-color: rgba(239,197,109,.42) !important;
          background: linear-gradient(135deg, rgba(239,197,109,.13), rgba(88,199,255,.07)) !important;
        }
        .entry-cta-button {
          width: 100% !important;
          min-height: 48px !important;
        }
        .records-leaderboards,.reward-policy-strip,.reward-detail-grid{grid-template-columns:1fr!important}.records-title,.archive-section-head{align-items:start!important;flex-direction:column!important}.records-board{padding:10px!important}
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

    const boot = () => {
      const adminOpenBtn = document.querySelector("#adminOpenBtn");
      if (adminOpenBtn) {
        ensureSystemScreen(adminOpenBtn);
        installAdminGate(adminOpenBtn);
      }
      installRecordsEnhancements();
      setTimeout(installRecordsEnhancements, 600);
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  function installAdminGate(adminOpenBtn) {
    if (document.querySelector("#ownerOptionsBtn")) return;
    const ownerMount = document.querySelector("#ownerSystemMount");
    if (!ownerMount) return;
    const ownerOptionsBtn = document.createElement("button");
    ownerOptionsBtn.id = "ownerOptionsBtn";
    ownerOptionsBtn.className = "secondary-button owner-options-text";
    ownerOptionsBtn.type = "button";
    ownerOptionsBtn.setAttribute("aria-label", "\u958b\u8a2d\u8005\u30aa\u30d7\u30b7\u30e7\u30f3");
    ownerOptionsBtn.title = "\u958b\u8a2d\u8005\u30aa\u30d7\u30b7\u30e7\u30f3";
    ownerOptionsBtn.textContent = "\u7ba1\u7406\u753b\u9762\u3092\u958b\u304f";
    adminOpenBtn.classList.add("hidden");
    ownerMount.appendChild(ownerOptionsBtn);
    ownerOptionsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      adminOpenBtn.click();
    });

    const adminLoginBtn = document.querySelector("#adminLoginBtn");
    const adminPin = document.querySelector("#adminPin");
    if (adminPin) adminPin.placeholder = "\u7ba1\u7406PIN";
    adminLoginBtn?.addEventListener(
      "click",
      (event) => {
        event.stopImmediatePropagation();
        window.unlockAdminConsole?.(adminPin?.value || "");
      },
      true
    );
  }

  function ensureSystemScreen(adminOpenBtn) {
    if (!document.querySelector("[data-go='system']")) {
      const nav = document.querySelector(".public-nav");
      const reportButton = document.querySelector("#reportNavBtn");
      const systemButton = document.createElement("button");
      systemButton.className = "nav-button";
      systemButton.type = "button";
      systemButton.dataset.go = "system";
      systemButton.textContent = "\u30b7\u30b9\u30c6\u30e0";
      systemButton.addEventListener("click", (event) => {
        event.preventDefault();
        openSystemScreen();
      });
      nav?.insertBefore(systemButton, reportButton || null);
    }

    if (document.querySelector("#system")) {
      if (!document.querySelector("#ownerSystemMount")) {
        document.querySelector(".owner-system-card")?.insertAdjacentHTML("beforeend", '<div id="ownerSystemMount"></div>');
      }
      return;
    }

    const system = document.createElement("section");
    system.id = "system";
    system.className = "screen";
    system.innerHTML = `
      <div class="page-heading">
        <p class="eyebrow">System</p>
        <h2>\u30b7\u30b9\u30c6\u30e0</h2>
        <p>\u5229\u7528\u898f\u7d04\u3001\u904b\u55b6\u30dd\u30ea\u30b7\u30fc\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u4fdd\u5b88\u3001\u958b\u8a2d\u8005\u5411\u3051\u306e\u64cd\u4f5c\u3092\u307e\u3068\u3081\u3066\u3044\u307e\u3059\u3002</p>
      </div>
      <section class="panel system-panel">
        <details class="system-card">
          <summary>\u5229\u7528\u898f\u7d04\u30fb\u5927\u4f1a\u53c2\u52a0\u30eb\u30fc\u30eb</summary>
          <ul>
            <li>\u30c1\u30a7\u30c3\u30af\u30a4\u30f3\u5f8c\u306e\u9014\u4e2d\u8f9e\u9000\u3001\u7121\u65ad\u6b20\u5e2d\u3001\u9032\u884c\u3092\u59a8\u3052\u308b\u884c\u70ba\u306f\u7981\u6b62\u3067\u3059\u3002</li>
            <li>\u516b\u767e\u9577\u3001\u30a6\u30a3\u30f3\u30c8\u30ec\u30fc\u30c9\u3001\u8ac7\u5408\u3001\u9806\u4f4d\u64cd\u4f5c\u3001\u5916\u90e8\u9023\u7d61\u306b\u3088\u308b\u4e0d\u6b63\u306a\u5354\u529b\u306f\u7981\u6b62\u3067\u3059\u3002</li>
            <li>\u904b\u55b6\u304b\u3089\u306e\u6848\u5185\u3001\u30c6\u30fc\u30d6\u30eb\u4f5c\u6210\u4f9d\u983c\u3001\u7d50\u679c\u5831\u544a\u306e\u6307\u793a\u306b\u306f\u901f\u3084\u304b\u306b\u5bfe\u5fdc\u3057\u3066\u304f\u3060\u3055\u3044\u3002</li>
          </ul>
        </details>
        <details class="system-card">
          <summary>\u30a2\u30ab\u30a6\u30f3\u30c8\u4fdd\u5b88</summary>
          <p>\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u9023\u643a\u3068\u30d1\u30b9\u30ef\u30fc\u30c9\u5909\u66f4\u306f\u30de\u30a4\u30da\u30fc\u30b8\u306e\u30a2\u30ab\u30a6\u30f3\u30c8\u60c5\u5831\u304b\u3089\u7de8\u96c6\u3067\u304d\u307e\u3059\u3002</p>
        </details>
        <details class="system-card owner-system-card">
          <summary>\u958b\u8a2d\u8005\u30aa\u30d7\u30b7\u30e7\u30f3</summary>
          <p>\u5927\u4f1a\u4f5c\u6210\u3001\u524a\u9664\u3001\u9032\u884c\u88dc\u52a9\u306a\u3069\u306e\u7ba1\u7406\u64cd\u4f5c\u306f\u958b\u8a2d\u8005\u306e\u307f\u4f7f\u7528\u3057\u307e\u3059\u3002</p>
          <div id="ownerSystemMount"></div>
        </details>
      </section>
    `;
    document.querySelector("main")?.insertBefore(system, adminOpenBtn.closest(".screen") || null);
  }

  function openSystemScreen() {
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === "system"));
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === "system"));
    if (location.hash !== "#system") location.hash = "system";
  }

  function installAdminUserEditor() {
    const boot = () => {
      const table = document.querySelector("#playersTable");
      if (!table || table.dataset.adminEditor === "1") return;
      table.dataset.adminEditor = "1";
      const observer = new MutationObserver(() => renderEditableRows(table));
      observer.observe(table, { childList: true, subtree: true });
      table.addEventListener("change", (event) => {
        const input = event.target.closest(".admin-player-input");
        if (!input) return;
        saveAdminPlayerField(input.dataset.id, input.dataset.field, input.value);
      });
      renderEditableRows(table);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    setTimeout(boot, 1000);
  }

  function installRecordsEnhancements() {
    renameArchiveNav();
    renderRecordsScreen();
    lockRewardCosmetics();
  }

  function renameArchiveNav() {
    document.querySelectorAll('[data-go="past"]').forEach((item) => {
      if (["\u904e\u53bb\u5927\u4f1a", "Past"].includes(item.textContent.trim())) item.textContent = "\u8a18\u9332";
    });
    const heading = document.querySelector("#past .page-heading");
    if (!heading) return;
    const eyebrow = heading.querySelector(".eyebrow");
    const title = heading.querySelector("h2");
    const body = heading.querySelector("p:last-child");
    if (eyebrow) eyebrow.textContent = "Records";
    if (title) title.textContent = "\u8a18\u9332";
    if (body) body.textContent = "\u7af6\u6280\u30e9\u30f3\u30ad\u30f3\u30b0\u3001\u5927\u4f1a\u6210\u7e3e\u3001\u7d42\u4e86\u3057\u305f\u5927\u4f1a\u306e\u6700\u7d42\u9806\u4f4d\u3092\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002";
  }

  function renderRecordsScreen() {
    const mount = document.querySelector("#pastTournamentsList");
    if (!mount) return;
    const data = readAppState();
    const currentUserId = currentProfileId();
    const past = (data.tournaments || []).filter((item) => item.tournament?.status === "finished");
    const archive = past.map((item) => {
      const tournament = item.tournament || {};
      const standings = calculateTournamentStandings(item).slice(0, 16);
      return `
        <article class="past-tournament-card">
          <div class="past-tournament-head">
            <div>
              <span>${escapeHtml(formatDate(tournament.startAt))}</span>
              <strong>${escapeHtml(tournament.name || "\u7121\u984c\u306e\u5927\u4f1a")}</strong>
              <small>${escapeHtml(formatLabel(tournament.formatType))}</small>
            </div>
            <span class="archive-chip">\u6700\u7d42\u9806\u4f4d</span>
          </div>
          <div class="past-final-standings">
            ${standings.length ? standings.map((row, index) => `
              <div class="${row.player.id === currentUserId ? "is-current" : ""}">
                <b>${index + 1}</b>
                <span>${escapeHtml(row.player.displayName || "Player")}</span>
                <strong>${row.points}pt</strong>
              </div>
            `).join("") : `<div class="empty-state">\u9806\u4f4d\u30c7\u30fc\u30bf\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002</div>`}
          </div>
        </article>
      `;
    }).join("");
    mount.innerHTML = `
      <section class="records-dashboard">
        <div class="records-title">
          <div>
            <p class="eyebrow">Competitive Records</p>
            <h3>\u7af6\u6280\u30e9\u30f3\u30ad\u30f3\u30b0</h3>
          </div>
          <span>\u5927\u4f1a\u6700\u7d42\u9806\u4f4d\u304b\u3089RiseP\u3092\u96c6\u8a08</span>
        </div>
        <div class="records-leaderboards">
          ${leaderboardMarkup("\u30c7\u30a4\u30ea\u30fc", calculateCompetitiveLeaderboard(data, "daily"), "\u4eca\u65e5\u306e\u4e0a\u4f4d")}
          ${leaderboardMarkup("\u30de\u30f3\u30b9\u30ea\u30fc", calculateCompetitiveLeaderboard(data, "monthly"), "\u4eca\u6708\u306e\u4e0a\u4f4d")}
          ${leaderboardMarkup("\u30bb\u30c3\u30c8\u671f\u9593", calculateCompetitiveLeaderboard(data, "set"), "Set\u671f\u9593\u7d2f\u8a08")}
          ${leaderboardMarkup("\u7dcf\u5408", calculateCompetitiveLeaderboard(data, "all"), "\u5168\u671f\u9593\u7d2f\u8a08")}
        </div>
      </section>
      ${past.length ? `<div class="archive-section-head"><p class="eyebrow">Tournament Archive</p><h3>\u5927\u4f1a\u30a2\u30fc\u30ab\u30a4\u30d6</h3></div>${archive}` : `<div class="empty-state">\u7d42\u4e86\u3057\u305f\u5927\u4f1a\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u5927\u4f1a\u304c\u5b8c\u4e86\u3059\u308b\u3068\u3001\u3053\u3053\u306b\u6700\u7d42\u9806\u4f4d\u304c\u6b8b\u308a\u307e\u3059\u3002</div>`}
    `;
  }

  function leaderboardMarkup(title, rows, caption) {
    const currentUserId = currentProfileId();
    const visibleRows = rows.slice(0, 5);
    return `
      <article class="records-board">
        <div class="records-board-head"><span>${escapeHtml(caption)}</span><strong>${escapeHtml(title)}</strong></div>
        <div class="records-board-list">
          ${visibleRows.length ? visibleRows.map((row, index) => `
            <div class="records-player-row ${row.playerId === currentUserId ? "is-current" : ""}">
              <b>${index + 1}</b>
              <span>${escapeHtml(row.displayName)}</span>
              <strong>${row.rewardPoints} RiseP</strong>
            </div>
          `).join("") : `<div class="empty-state">\u307e\u3060\u30e9\u30f3\u30ad\u30f3\u30b0\u5bfe\u8c61\u306e\u6210\u7e3e\u306f\u3042\u308a\u307e\u305b\u3093\u3002</div>`}
        </div>
      </article>
    `;
  }

  function lockRewardCosmetics() {
    const form = document.querySelector("#rewardCosmeticsForm");
    if (!form || form.dataset.riseLocked === "1") return;
    form.dataset.riseLocked = "1";
    const select = form.querySelector('select[name="selectedTitle"]');
    if (select) {
      select.innerHTML = `<option value="">\u30c7\u30d5\u30a9\u30eb\u30c8\u306e\u307f</option>`;
      select.disabled = true;
    }
    const note = form.querySelector(".security-note");
    if (note) note.textContent = "\u79f0\u53f7\u3001\u7279\u5225\u30a2\u30a4\u30b3\u30f3\u3001\u30d5\u30ec\u30fc\u30e0\u306f\u4eca\u5f8c\u5b9f\u88c5\u4e88\u5b9a\u3067\u3059\u3002\u73fe\u5728\u8a2d\u5b9a\u3067\u304d\u308b\u306e\u306f\u30c7\u30d5\u30a9\u30eb\u30c8\u30a2\u30a4\u30b3\u30f3\u306e\u307f\u3067\u3059\u3002";
    const grid = form.querySelector(".reward-grid");
    if (grid) {
      grid.innerHTML = `
        <article class="reward-card active"><span>\u30c7\u30d5\u30a9\u30eb\u30c8</span><strong>\u9ed2\u30a2\u30a4\u30b3\u30f3</strong><small>\u5168\u30d7\u30ec\u30a4\u30e4\u30fc\u5171\u901a</small></article>
        <article class="reward-card locked"><span>\u79f0\u53f7</span><strong>\u5b9f\u88c5\u4e88\u5b9a\u30a2\u30a4\u30c6\u30e0</strong><small>\u5927\u4f1a\u5831\u916c\u3068\u3057\u3066\u5f8c\u65e5\u89e3\u653e\u4e88\u5b9a</small></article>
        <article class="reward-card locked"><span>\u30d5\u30ec\u30fc\u30e0</span><strong>\u5b9f\u88c5\u4e88\u5b9a\u30a2\u30a4\u30c6\u30e0</strong><small>\u5927\u4f1a\u5831\u916c\u3068\u3057\u3066\u5f8c\u65e5\u89e3\u653e\u4e88\u5b9a</small></article>
      `;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.textContent = "\u73fe\u5728\u306f\u5909\u66f4\u3067\u304d\u307e\u305b\u3093";
      button.disabled = true;
    }
  }

  function calculateCompetitiveLeaderboard(data, period) {
    const ledger = new Map();
    (data.tournaments || [])
      .filter((item) => item.tournament?.status === "finished")
      .filter((item) => tournamentInPeriod(item, period))
      .forEach((item) => {
        calculateTournamentStandings(item).forEach((row, index) => {
          const rank = index + 1;
          const rewardPoints = risePointsForRank(rank);
          if (!rewardPoints) return;
          const key = normalizeLoose(row.player.riotId || row.player.accountEmail || row.player.discordId || row.player.displayName || row.player.id);
          const record = ledger.get(key) || { playerId: row.player.id, displayName: row.player.displayName || "Player", rewardPoints: 0, wins: 0, podiums: 0, top8s: 0 };
          record.rewardPoints += rewardPoints;
          record.wins += rank === 1 ? 1 : 0;
          record.podiums += rank <= 3 ? 1 : 0;
          record.top8s += rank <= 8 ? 1 : 0;
          ledger.set(key, record);
        });
      });
    return [...ledger.values()].sort((a, b) => b.rewardPoints - a.rewardPoints || b.wins - a.wins || b.podiums - a.podiums || b.top8s - a.top8s || a.displayName.localeCompare(b.displayName, "ja"));
  }

  function risePointsForRank(rank) {
    if (rank === 1) return 20;
    if (rank === 2) return 15;
    if (rank === 3) return 12;
    if (rank === 4) return 10;
    if (rank <= 8) return 6;
    if (rank <= 16) return 3;
    return 0;
  }

  function calculateTournamentStandings(tournamentState) {
    const players = tournamentState.players || [];
    const results = tournamentState.results || {};
    return players.map((player) => {
      const history = [1, 2, 3, 4, 5, 6].map((gameNo) => Number(results[gameNo]?.[player.id] || 0));
      const played = history.filter(Boolean);
      const points = played.reduce((sum, placement) => sum + (placement ? 9 - Number(placement) : 0), 0);
      const firsts = played.filter((placement) => placement === 1).length;
      const top4 = played.filter((placement) => placement >= 1 && placement <= 4).length;
      const firstRate = played.length ? firsts / played.length : 0;
      const top4Rate = played.length ? top4 / played.length : 0;
      const average = played.length ? played.reduce((sum, placement) => sum + placement, 0) / played.length : 0;
      const finalPlacement = history.slice().reverse().find(Boolean) || 99;
      return { player, history, points, firsts, firstRate, top4Rate, average, finalPlacement };
    }).sort((a, b) => b.points - a.points || b.firstRate - a.firstRate || b.firsts - a.firsts || b.top4Rate - a.top4Rate || a.average - b.average || a.finalPlacement - b.finalPlacement || String(a.player.displayName || "").localeCompare(String(b.player.displayName || ""), "ja"));
  }

  function tournamentInPeriod(item, period) {
    if (period === "all" || period === "set") return true;
    const date = item.tournament?.startAt ? new Date(item.tournament.startAt) : new Date();
    if (Number.isNaN(date.getTime())) return true;
    const now = new Date();
    if (period === "daily") return date.toDateString() === now.toDateString();
    if (period === "monthly") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    return true;
  }

  function currentProfileId() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")?.id || "";
    } catch {
      return "";
    }
  }

  function readAppState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function formatDate(value) {
    if (!value) return "\u672a\u8a2d\u5b9a";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "\u672a\u8a2d\u5b9a";
    return date.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function formatLabel(type) {
    return { sixGame: "6\u6226\u7dcf\u5408pt\u5f0f", oneDayElim: "1\u65e5\u5b8c\u7d50\u578b\uff08\u9c39\u7bc0\u676f\u30eb\u30fc\u30eb\uff09", multiDay: "TPC\u5f0fDay\u5236", custom: "\u30ab\u30b9\u30bf\u30e0" }[type] || "6\u6226\u7dcf\u5408pt\u5f0f";
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
        const cell = cells[index + 1];
        const type = field === "accountEmail" ? "email" : "text";
        cell.innerHTML = `<input class="admin-player-input" type="${type}" data-id="${escapeAttr(id)}" data-field="${field}" value="${escapeAttr(player[field] || "")}" />`;
      });
      row.dataset.adminEditable = "1";
    });
  }

  function currentStoredPlayers() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const active = data.tournaments?.find((item) => item.id === data.activeTournamentId);
      return active?.players || data.players || [];
    } catch {
      return [];
    }
  }

  function saveAdminPlayerField(playerId, field, value) {
    const allowed = new Set(["displayName", "riotId", "discordId", "xAccount", "accountEmail"]);
    if (!allowed.has(field)) return;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const active = data.tournaments?.find((item) => item.id === data.activeTournamentId);
      const previous = { ...(active?.players || data.players || []).find((item) => item.id === playerId) };
      updatePlayerList(data.players, playerId, field, value);
      if (active) updatePlayerList(active.players, playerId, field, value);
      originalSetItem(STORAGE_KEY, JSON.stringify(data));
      scheduleSave();
      syncAccountProfiles(previous, { ...previous, [field]: String(value || "").trim() });
    } catch (error) {
      console.warn("TFTRise admin user save failed:", error);
    }
  }

  function updatePlayerList(players, playerId, field, value) {
    if (!Array.isArray(players)) return;
    const player = players.find((item) => item.id === playerId);
    if (player) player[field] = String(value || "").trim();
  }

  function syncAccountProfiles(previous, updated) {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
      Object.keys(accounts).forEach((key) => {
        if (!profileMatches(accounts[key]?.profile, previous)) return;
        accounts[key].profile = { ...(accounts[key].profile || {}), ...updated };
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
    return String(value || "").toLowerCase().normalize("NFKC").replace(/[#].*$/, "").replace(/[^a-z0-9@\._-]/g, "");
  }

  function escapeAttr(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }
})();

