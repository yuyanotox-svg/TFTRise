const STORAGE_KEY = "tft-space-gods-cup";
const SESSION_KEY = "tftrise-current-user";
const PROFILE_KEY = "tftrise-profile";
const ACCOUNTS_KEY = "tftrise-accounts";
const MY_PAGE_TAB_KEY = "tftrise-mypage-tab";
const BLOCKS = [
  { label: "第1ブロック", games: [1, 2] },
  { label: "第2ブロック", games: [3, 4] },
  { label: "第3ブロック", games: [5, 6] },
];

const scoreForPlacement = (placement) => (placement ? 9 - Number(placement) : 0);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const DEFAULT_AVATAR_URL = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
const ADMIN_SESSION_KEY = "tftrise-admin-unlocked";
const LOCAL_ADMIN_PIN = "Yuuya1228";
const REWARD_TITLES = [
  { id: "champion", name: "実装予定アイテム", note: "大会報酬予定" },
  { id: "finalist", name: "実装予定アイテム", note: "大会報酬予定" },
  { id: "top4", name: "実装予定アイテム", note: "大会報酬予定" },
];
const REWARD_FRAMES = [
  { id: "gold", name: "実装予定アイテム", note: "大会報酬予定" },
  { id: "blue", name: "実装予定アイテム", note: "大会報酬予定" },
];
const defaultStages = () => [
  { name: "6戦総合pt", detail: "全6戦。ロビー抽選の頻度は管理側の設定に従い、合計ポイントで総合順位を決定。" },
];

function defaultTournament() {
  return {
    id: uid(),
    name: "新しい大会",
    startAt: "",
    status: "entry",
    formatType: "sixGame",
    maxPlayers: 256,
    lobbyRule: "every2Games",
    contactLabel: "運営Discord",
    contactUrl: "",
    stages: defaultStages(),
  };
}

const defaultState = () => ({
  activeTournamentId: "",
  tournaments: [],
  deletedTournaments: {},
  tournament: null,
  players: [],
  lobbies: [[], [], []],
  lobbyHosts: [[], [], []],
  results: {},
  reports: [],
});

let state = loadState();
let currentUserId = localStorage.getItem(SESSION_KEY) || "";
let currentProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
let pendingDeleteMode = "";
let currentMyPageTab = localStorage.getItem(MY_PAGE_TAB_KEY) || "tournament";
if (!currentProfile && currentUserId) {
  const player = state.players.find((item) => item.id === currentUserId);
  if (player) currentProfile = {
    displayName: player.displayName,
    riotId: player.riotId,
    discordId: player.discordId,
    xAccount: player.xAccount,
    avatarUrl: player.avatarUrl,
    selectedTitle: player.selectedTitle,
    earnedTitles: player.earnedTitles,
    avatarFrame: player.avatarFrame,
  };
}
let accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
let authMode = "login";
let selectedReportFile = null;
let latestReportMatches = [];

const els = {
  authForm: document.querySelector("#authForm"),
  authLoginId: document.querySelector("#authLoginId"),
  authPassword: document.querySelector("#authPassword"),
  authProfileFields: document.querySelector("#authProfileFields"),
  authDisplayName: document.querySelector("#authDisplayName"),
  authRiotName: document.querySelector("#authRiotName"),
  authRiotTag: document.querySelector("#authRiotTag"),
  authDiscordId: document.querySelector("#authDiscordId"),
  authXAccount: document.querySelector("#authXAccount"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  authHelpText: document.querySelector("#authHelpText"),
  reportNavBtn: document.querySelector("#reportNavBtn"),
  homePlayerCount: document.querySelector("#homePlayerCount"),
  homeSubCount: document.querySelector("#homeSubCount"),
  homeCompletedGames: document.querySelector("#homeCompletedGames"),
  entryCtaPanel: document.querySelector("#entryCtaPanel"),
  entryCtaTitle: document.querySelector("#entryCtaTitle"),
  entryCtaText: document.querySelector("#entryCtaText"),
  entryCtaSteps: document.querySelector("#entryCtaSteps"),
  homeEntryBtn: document.querySelector("#homeEntryBtn"),
  homeCheckInBtn: document.querySelector("#homeCheckInBtn"),
  entryCompleteToast: document.querySelector("#entryCompleteToast"),
  publicTournamentName: document.querySelector("#publicTournamentName"),
  publicTournamentSummary: document.querySelector("#publicTournamentSummary"),
  publicStatusBadge: document.querySelector("#publicStatusBadge"),
  publicStartAt: document.querySelector("#publicStartAt"),
  publicFormatName: document.querySelector("#publicFormatName"),
  publicLobbyRule: document.querySelector("#publicLobbyRule"),
  publicFormatDetails: document.querySelector("#publicFormatDetails"),
  publicTimelineDetails: document.querySelector("#publicTimelineDetails"),
  tournamentCarousel: document.querySelector("#tournamentCarousel"),
  publicPlayersList: document.querySelector("#publicPlayersList"),
  publicStandingsPanel: document.querySelector("#publicStandingsPanel"),
  publicStandingsList: document.querySelector("#publicStandingsList"),
  publicLobbyPanel: document.querySelector("#publicLobbyPanel"),
  publicLobbyList: document.querySelector("#publicLobbyList"),
  pastTournamentsList: document.querySelector("#pastTournamentsList"),
  tournamentCard: document.querySelector("#tournamentCard"),
  tournamentDialog: document.querySelector("#tournamentDialog"),
  dialogCloseBtn: document.querySelector("#dialogCloseBtn"),
  dialogTournamentName: document.querySelector("#dialogTournamentName"),
  dialogStatus: document.querySelector("#dialogStatus"),
  dialogStartAt: document.querySelector("#dialogStartAt"),
  dialogFormatName: document.querySelector("#dialogFormatName"),
  dialogLobbyRule: document.querySelector("#dialogLobbyRule"),
  dialogEntryBtn: document.querySelector("#dialogEntryBtn"),
  dialogReportBtn: document.querySelector("#dialogReportBtn"),
  dialogDetailToggle: document.querySelector("#dialogDetailToggle"),
  dialogTimelineToggle: document.querySelector("#dialogTimelineToggle"),
  entryNoticeDialog: document.querySelector("#entryNoticeDialog"),
  entryNoticeAgreeBtn: document.querySelector("#entryNoticeAgreeBtn"),
  entryNoticeCancelBtn: document.querySelector("#entryNoticeCancelBtn"),
  entryNoticeTimeline: document.querySelector("#entryNoticeTimeline"),
  entryTimelineConfirm: document.querySelector("#entryTimelineConfirm"),
  entryRuleConfirm: document.querySelector("#entryRuleConfirm"),
  hostDialog: document.querySelector("#hostDialog"),
  hostDialogText: document.querySelector("#hostDialogText"),
  hostDialogCloseBtn: document.querySelector("#hostDialogCloseBtn"),
  openLobbyGuideBtn: document.querySelector("#openLobbyGuideBtn"),
  lobbyGuideDialog: document.querySelector("#lobbyGuideDialog"),
  guideCloseBtn: document.querySelector("#guideCloseBtn"),
  reportGame: document.querySelector("#reportGame"),
  reportLobby: document.querySelector("#reportLobby"),
  reportTargetSummary: document.querySelector("#reportTargetSummary"),
  reportSubmitterName: document.querySelector("#reportSubmitterName"),
  reportGate: document.querySelector("#reportGate"),
  reportImage: document.querySelector("#reportImage"),
  reportPreview: document.querySelector("#reportPreview"),
  reportStatus: document.querySelector("#reportStatus"),
  reportMatches: document.querySelector("#reportMatches"),
  manualFallbackRows: document.querySelector("#manualFallbackRows"),
  mySummary: document.querySelector("#mySummary"),
  myNextAction: document.querySelector("#myNextAction"),
  myEntryActions: document.querySelector("#myEntryActions"),
  myPageTabs: document.querySelector("#myPageTabs"),
  myTournamentPanel: document.querySelector("#myTournamentPanel"),
  myAccountPanel: document.querySelector("#myAccountPanel"),
  myTournamentBadge: document.querySelector("#myTournamentBadge"),
  myAccountBadge: document.querySelector("#myAccountBadge"),
  myPageTabNotes: document.querySelector("#myPageTabNotes"),
  myProfileOutput: document.querySelector("#myProfileOutput"),
  myLobbyOutput: document.querySelector("#myLobbyOutput"),
  myHistoryOutput: document.querySelector("#myHistoryOutput"),
  myPastResultsOutput: document.querySelector("#myPastResultsOutput"),
  myPageTopBtn: document.querySelector("#myPageTopBtn"),
  checkInDialog: document.querySelector("#checkInDialog"),
  checkInDialogCloseBtn: document.querySelector("#checkInDialogCloseBtn"),
  checkInDialogBtn: document.querySelector("#checkInDialogBtn"),
  deleteConfirmDialog: document.querySelector("#deleteConfirmDialog"),
  deleteConfirmTitle: document.querySelector("#deleteConfirmTitle"),
  deleteConfirmText: document.querySelector("#deleteConfirmText"),
  deleteConfirmTarget: document.querySelector("#deleteConfirmTarget"),
  deleteConfirmInput: document.querySelector("#deleteConfirmInput"),
  deleteConfirmExecuteBtn: document.querySelector("#deleteConfirmExecuteBtn"),
  deleteConfirmCancelBtn: document.querySelector("#deleteConfirmCancelBtn"),
  analyzeReportBtn: document.querySelector("#analyzeReportBtn"),
  submitOcrBtn: document.querySelector("#submitOcrBtn"),
  submitManualBtn: document.querySelector("#submitManualBtn"),
  logoutTopBtn: document.querySelector("#logoutTopBtn"),
  adminOpenBtn: document.querySelector("#adminOpenBtn"),
  adminLock: document.querySelector("#adminLock"),
  adminConsole: document.querySelector("#adminConsole"),
  adminNextAction: document.querySelector("#adminNextAction"),
  adminOpsChecklist: document.querySelector("#adminOpsChecklist"),
  startReadinessOutput: document.querySelector("#startReadinessOutput"),
  runHealthCheckBtn: document.querySelector("#runHealthCheckBtn"),
  healthCheckOutput: document.querySelector("#healthCheckOutput"),
  runDataAuditBtn: document.querySelector("#runDataAuditBtn"),
  dataAuditOutput: document.querySelector("#dataAuditOutput"),
  adminPin: document.querySelector("#adminPin"),
  adminLoginBtn: document.querySelector("#adminLoginBtn"),
  openEntryBtn: document.querySelector("#openEntryBtn"),
  openCheckInBtn: document.querySelector("#openCheckInBtn"),
  startTournamentBtn: document.querySelector("#startTournamentBtn"),
  finishTournamentBtn: document.querySelector("#finishTournamentBtn"),
  generateAllBtn: document.querySelector("#generateAllBtn"),
  autoDebugResultsBtn: document.querySelector("#autoDebugResultsBtn"),
  blockActions: document.querySelector(".block-actions"),
  seed256Btn: document.querySelector("#seed256Btn"),
  exportBtn: document.querySelector("#exportBtn"),
  importFile: document.querySelector("#importFile"),
  resetBtn: document.querySelector("#resetBtn"),
  loadBackupsBtn: document.querySelector("#loadBackupsBtn"),
  backupsOutput: document.querySelector("#backupsOutput"),
  playersTable: document.querySelector("#playersTable"),
  lobbyOutput: document.querySelector("#lobbyOutput"),
  adminResultsOutput: document.querySelector("#adminResultsOutput"),
  standingsTable: document.querySelector("#standingsTable"),
  placementTemplate: document.querySelector("#placementOptions"),
  createTournamentBtn: document.querySelector("#createTournamentBtn"),
  deleteTournamentBtn: document.querySelector("#deleteTournamentBtn"),
  deleteAllTournamentsBtn: document.querySelector("#deleteAllTournamentsBtn"),
  tournamentList: document.querySelector("#tournamentList"),
  tournamentForm: document.querySelector("#tournamentForm"),
  tournamentName: document.querySelector("#tournamentName"),
  tournamentStart: document.querySelector("#tournamentStart"),
  tournamentStatus: document.querySelector("#tournamentStatus"),
  tournamentFormatType: document.querySelector("#tournamentFormatType"),
  tournamentMaxPlayers: document.querySelector("#tournamentMaxPlayers"),
  tournamentLobbyRule: document.querySelector("#tournamentLobbyRule"),
  tournamentContactLabel: document.querySelector("#tournamentContactLabel"),
  tournamentContactUrl: document.querySelector("#tournamentContactUrl"),
  formatStages: document.querySelector("#formatStages"),
  addStageBtn: document.querySelector("#addStageBtn"),
  supportContactOutput: document.querySelector("#supportContactOutput"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    if (!loaded.tournament && loaded.tournaments?.length) {
      const first = loaded.tournaments[0];
      loaded.activeTournamentId = first.id;
      loaded.tournament = structuredClone(first.tournament);
      loaded.players = structuredClone(first.players);
      loaded.lobbies = structuredClone(first.lobbies);
      loaded.lobbyHosts = structuredClone(first.lobbyHosts);
      loaded.results = structuredClone(first.results);
      loaded.reports = structuredClone(first.reports);
    }
    if (!loaded.tournament) return loaded;
    if (loaded.tournament?.status === "upcoming") loaded.tournament.status = "entry";
    if (loaded.tournament?.formatType === "openSwiss") {
      loaded.tournament.formatType = "sixGame";
    }
    loaded.tournaments?.forEach((item) => {
      if (item.tournament?.status === "upcoming") item.tournament.status = "entry";
      if (item.tournament?.formatType === "openSwiss") item.tournament.formatType = "sixGame";
      if (!item.tournament?.maxPlayers) item.tournament.maxPlayers = 256;
    });
    if (!loaded.tournament.maxPlayers) loaded.tournament.maxPlayers = 256;
    if (
      loaded.tournament?.formatType === "oneDayElim" &&
      loaded.tournament.stages?.some((stage) => stage.detail === "128名から64名へ絞り込み。")
    ) {
      loaded.tournament.stages = formatTemplate("oneDayElim");
    }
    if (loaded.tournament?.name === "SPACE GODS CUSPACE GODS TEST") {
      loaded.tournament.name = "SPACE GODS CUP";
    }
    if (!loaded.tournaments?.length && loaded.tournament) {
      loaded.tournament.id = loaded.tournament.id || loaded.activeTournamentId || "main";
      loaded.activeTournamentId = loaded.tournament.id;
      loaded.tournaments = [snapshotCurrentTournament(loaded)];
    }
    return loaded;
  } catch {
    return defaultState();
  }
}

function saveState() {
  if (hasTournament()) syncActiveTournament();
  state.deletedTournaments = state.deletedTournaments || {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasTournament() {
  return Boolean(state.tournament && state.activeTournamentId);
}

function snapshotCurrentTournament(source = state) {
  if (!source.tournament) return null;
  return {
    id: source.tournament.id || source.activeTournamentId || uid(),
    tournament: structuredClone(source.tournament),
    players: structuredClone(source.players),
    lobbies: structuredClone(source.lobbies),
    lobbyHosts: structuredClone(source.lobbyHosts),
    results: structuredClone(source.results),
    reports: structuredClone(source.reports),
  };
}

function syncActiveTournament() {
  const snapshot = snapshotCurrentTournament();
  if (!snapshot) return;
  state.deletedTournaments = state.deletedTournaments || {};
  if (state.deletedTournaments[snapshot.id]) return;
  const index = state.tournaments.findIndex((item) => item.id === snapshot.id);
  if (index >= 0) state.tournaments[index] = snapshot;
  else state.tournaments.push(snapshot);
  state.activeTournamentId = snapshot.id;
}

function markTournamentDeleted(id) {
  if (!id) return;
  state.deletedTournaments = state.deletedTournaments || {};
  state.deletedTournaments[id] = new Date().toISOString();
}

function markAllTournamentsDeleted() {
  state.deletedTournaments = state.deletedTournaments || {};
  (state.tournaments || []).forEach((item) => markTournamentDeleted(item.id));
  if (state.activeTournamentId) markTournamentDeleted(state.activeTournamentId);
  if (state.tournament?.id) markTournamentDeleted(state.tournament.id);
}

function automatedTournamentStatus(tournament) {
  if (!tournament) return "entry";
  const current = tournament.status === "upcoming" ? "entry" : tournament.status || "entry";
  if (current === "live" || current === "finished") return current;
  if (!tournament.startAt) return current === "ready" ? "ready" : "entry";
  const start = new Date(tournament.startAt).getTime();
  if (!Number.isFinite(start)) return "entry";
  const now = Date.now();
  const checkInOpen = start - 30 * 60 * 1000;
  if (now < checkInOpen) return "entry";
  if (now <= start) return "checkin";
  return "ready";
}

function applyTournamentAutomation() {
  (state.tournaments || []).forEach((item) => {
    if (item.tournament) {
      item.tournament.status = automatedTournamentStatus(item.tournament);
      resetPrematureCheckInFinalization(item);
      if (["ready", "live"].includes(item.tournament.status) && !item.tournament.checkInFinalizedAt) {
        finalizeCheckInState(item);
      }
    }
  });
  if (state.tournament) {
    state.tournament.status = automatedTournamentStatus(state.tournament);
    resetPrematureCheckInFinalization(state);
    if (["ready", "live"].includes(state.tournament.status) && !state.tournament.checkInFinalizedAt) {
      finalizeCheckInState(state);
    }
  }
}

function resetPrematureCheckInFinalization(target) {
  if (!target?.tournament || !["entry", "checkin"].includes(target.tournament.status)) return;
  if (!target.tournament.checkInFinalizedAt && !(target.lobbies || []).some((block) => block?.length)) return;
  delete target.tournament.checkInFinalizedAt;
  (target.players || []).forEach((player) => {
    if (!player.checkedInAt) {
      player.didNotCheckIn = false;
      player.isSubstitute = false;
    }
  });
  target.lobbies = [];
  target.lobbyHosts = [];
  target.results = {};
  target.reports = [];
}

function checkedInPlayerList(source = state) {
  return (source.players || []).filter((player) => player.checkedInAt);
}

function finalizeCheckInState(target, { force = false } = {}) {
  if (!target?.tournament) return [];
  if (target.tournament.checkInFinalizedAt && !force) {
    return (target.players || []).filter((player) => player.checkedInAt && !player.isSubstitute);
  }
  const maxPlayers = Number(target.tournament?.maxPlayers || 256);
  const checked = checkedInPlayerList(target);
  const checkedIds = new Set(checked.map((player) => player.id));
  checked.forEach((player, index) => {
    player.isSubstitute = index >= maxPlayers;
    player.didNotCheckIn = false;
  });
  (target.players || []).forEach((player) => {
    if (checkedIds.has(player.id)) return;
    player.didNotCheckIn = true;
    player.isSubstitute = true;
  });
  target.tournament.checkInFinalizedAt = new Date().toISOString();
  const hasExistingLobbies = (target.lobbies || []).some((block) => block?.length);
  if (force || !hasExistingLobbies) {
    target.lobbies = [];
    target.lobbyHosts = [];
    target.results = {};
    target.reports = [];
  }
  return (target.players || []).filter((player) => player.checkedInAt && !player.isSubstitute);
}

function finalizeCheckInList({ force = false } = {}) {
  if (!hasTournament()) return [];
  finalizeCheckInState(state, { force });
  return getLobbyPlayerPool();
}

function prunePrematureLobbies() {
  if (!hasTournament() || state.tournament.status !== "live") return;
  const blocks = getLobbyBlocks();
  let lockedFrom = -1;
  for (let index = 0; index < blocks.length; index += 1) {
    const hasLobby = Boolean(state.lobbies?.[index]?.length);
    if (!hasLobby) {
      lockedFrom = index + 1;
      break;
    }
    if (!isBlockComplete(index)) {
      lockedFrom = index + 1;
      break;
    }
  }
  if (lockedFrom < 0) return;
  for (let index = lockedFrom; index < blocks.length; index += 1) {
    if (state.lobbies?.[index]) state.lobbies[index] = [];
    if (state.lobbyHosts?.[index]) state.lobbyHosts[index] = [];
    blocks[index].games.forEach((gameNo) => {
      if (state.results?.[gameNo] && !Object.keys(state.results[gameNo]).length) delete state.results[gameNo];
    });
  }
}

function loadTournament(id) {
  closeDeleteConfirm();
  applyTournamentAutomation();
  syncActiveTournament();
  const target = state.tournaments.find((item) => item.id === id);
  if (!target) return;
  setActiveTournamentFromSnapshot(target);
  render();
}

function setActiveTournamentFromSnapshot(target) {
  state.activeTournamentId = target.id;
  state.tournament = structuredClone(target.tournament);
  state.players = structuredClone(target.players);
  state.lobbies = structuredClone(target.lobbies);
  state.lobbyHosts = structuredClone(target.lobbyHosts);
  state.results = structuredClone(target.results);
  state.reports = structuredClone(target.reports);
}

function visibleHomeTournaments() {
  return (state.tournaments || []).filter((item) => item.tournament?.status !== "finished");
}

function ensureActiveHomeTournament() {
  if (location.hash && location.hash !== "#home") return;
  if (state.tournament?.status !== "finished") return;
  const next = visibleHomeTournaments()[0];
  if (next) setActiveTournamentFromSnapshot(next);
}

function findTournamentForCurrentProfile() {
  const riotKey = normalize(currentProfile?.riotId || "");
  if (!riotKey) return null;
  const scored = (state.tournaments || [])
    .map((tour) => {
      const player = (tour.players || []).find((item) => normalize(item.riotId || "") === riotKey);
      if (!player) return null;
      const status = tour.tournament?.status || "entry";
      const priority = { live: 5, ready: 4, checkin: 3, entry: 2, finished: 1 }[status] || 0;
      return { tour, player, priority };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
  return scored[0] || null;
}

function ensureActiveTournamentForMyPage() {
  const match = findTournamentForCurrentProfile();
  if (!match) return;
  if (state.activeTournamentId !== match.tour.id) setActiveTournamentFromSnapshot(match.tour);
  currentUserId = match.player.id;
  localStorage.setItem(SESSION_KEY, currentUserId);
}

function createTournament() {
  if (hasTournament()) syncActiveTournament();
  const tournament = defaultTournament();
  tournament.name = `新しい大会 ${state.tournaments.length + 1}`;
  state.activeTournamentId = tournament.id;
  state.tournament = tournament;
  state.players = [];
  state.lobbies = [];
  state.lobbyHosts = [];
  state.results = {};
  state.reports = [];
  state.tournaments.push(snapshotCurrentTournament());
  render();
}

function deleteCurrentTournament() {
  if (!hasTournament()) {
    notify("削除できません", "削除する大会がありません。", "warn");
    return;
  }
  openDeleteConfirm("current");
}

function executeDeleteCurrentTournament() {
  if (!hasTournament()) {
    notify("削除できません", "削除する大会がありません。", "warn");
    return;
  }
  const name = state.tournament.name || "現在の大会";
  exportStateBackup("before-delete-tournament");
  markTournamentDeleted(state.activeTournamentId);
  markTournamentDeleted(state.tournament?.id);
  state.tournaments = state.tournaments.filter((item) => item.id !== state.activeTournamentId);
  if (!state.tournaments.length) {
    clearActiveTournament();
    render();
    notify("大会を削除しました", `「${name}」を削除しました。`, "success");
    return;
  }
  const next = state.tournaments[0];
  state.activeTournamentId = next.id;
  state.tournament = structuredClone(next.tournament);
  state.players = structuredClone(next.players);
  state.lobbies = structuredClone(next.lobbies);
  state.lobbyHosts = structuredClone(next.lobbyHosts);
  state.results = structuredClone(next.results);
  state.reports = structuredClone(next.reports);
  render();
  notify("大会を削除しました", `「${name}」を削除しました。`, "success");
}

function deleteAllTournaments() {
  if (!state.tournaments.length && !hasTournament()) {
    notify("削除できません", "削除する大会がありません。", "warn");
    return;
  }
  openDeleteConfirm("all");
}

function executeDeleteAllTournaments() {
  if (!state.tournaments.length && !hasTournament()) {
    notify("削除できません", "削除する大会がありません。", "warn");
    return;
  }
  exportStateBackup("before-delete-all");
  markAllTournamentsDeleted();
  clearActiveTournament();
  render();
  go("admin");
  notify("全大会を削除しました", "作成済みの大会をすべて削除しました。", "success");
}

function openDeleteConfirm(mode) {
  if (!els.deleteConfirmDialog) return;
  pendingDeleteMode = mode;
  const isAll = mode === "all";
  const targetName = isAll ? `${state.tournaments.length || 0}件の大会すべて` : state.tournament?.name || "現在の大会";
  const requiredText = isAll ? "全部削除" : "大会削除";
  els.deleteConfirmTitle.textContent = isAll ? "大会を全部削除" : "現在の大会を削除";
  els.deleteConfirmText.textContent = isAll
    ? "作成済みの大会、参加者、ロビー、結果、提出履歴をすべて削除します。"
    : "選択中の大会、参加者、ロビー、結果、提出履歴を削除します。";
  els.deleteConfirmTarget.textContent = targetName;
  els.deleteConfirmInput.value = "";
  els.deleteConfirmInput.placeholder = `${requiredText} と入力`;
  els.deleteConfirmExecuteBtn.disabled = true;
  els.deleteConfirmExecuteBtn.textContent = isAll ? "全部削除する" : "大会を削除する";
  els.deleteConfirmDialog.showModal();
  setTimeout(() => els.deleteConfirmInput.focus(), 50);
}

function updateDeleteConfirmState() {
  if (!els.deleteConfirmExecuteBtn) return;
  const requiredText = pendingDeleteMode === "all" ? "全部削除" : "大会削除";
  els.deleteConfirmExecuteBtn.disabled = els.deleteConfirmInput.value.trim() !== requiredText;
}

function executePendingDelete() {
  const mode = pendingDeleteMode;
  const requiredText = mode === "all" ? "全部削除" : "大会削除";
  if (els.deleteConfirmInput.value.trim() !== requiredText) {
    notify("確認テキストが違います", `${requiredText} と入力してください。`, "warn");
    return;
  }
  closeDeleteConfirm();
  if (mode === "all") executeDeleteAllTournaments();
  else executeDeleteCurrentTournament();
}

function closeDeleteConfirm() {
  pendingDeleteMode = "";
  if (els.deleteConfirmDialog?.open) els.deleteConfirmDialog.close();
}

function clearActiveTournament() {
  state.activeTournamentId = "";
  state.tournament = null;
  state.players = [];
  state.lobbies = [];
  state.lobbyHosts = [];
  state.results = {};
  state.reports = [];
  state.tournaments = [];
  state.deletedTournaments = state.deletedTournaments || {};
}

function exportStateBackup(reason = "manual-export") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tftrise-${reason}-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function requestStateBackups(action, payload = {}) {
  const pin = prompt("管理PINを入力してください。");
  if (!pin) return null;
  const response = await fetch("/api/state-backups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, action, pin }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    notify("バックアップ操作失敗", result.message || "バックアップ操作に失敗しました。", "error");
    return null;
  }
  return result;
}

async function loadStateBackups() {
  if (!els.backupsOutput) return;
  els.backupsOutput.innerHTML = `<div class="empty-state">バックアップを読み込んでいます。</div>`;
  const result = await requestStateBackups("list");
  if (!result) {
    els.backupsOutput.innerHTML = "";
    return;
  }
  renderStateBackups(result.backups || []);
}

function renderStateBackups(backups) {
  if (!els.backupsOutput) return;
  if (!backups.length) {
    els.backupsOutput.innerHTML = `<div class="empty-state">まだサーバー側バックアップはありません。</div>`;
    return;
  }
  els.backupsOutput.innerHTML = backups.map((backup) => `
    <article class="backup-item">
      <div>
        <strong>${escapeHtml(formatBackupDate(backup.created_at))}</strong>
        <span>${escapeHtml(backup.reason || "backup")} / ID ${escapeHtml(String(backup.id))}</span>
      </div>
      <button class="danger-button restore-backup" type="button" data-backup-id="${escapeHtml(String(backup.id))}">この状態に戻す</button>
    </article>
  `).join("");
}

function formatBackupDate(value) {
  if (!value) return "日時不明";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function runHealthCheck() {
  if (!els.healthCheckOutput) return;
  els.healthCheckOutput.innerHTML = `<div class="empty-state">本番設定を確認しています。</div>`;
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Health check failed");
    renderHealthCheck(result);
  } catch (error) {
    els.healthCheckOutput.innerHTML = `<div class="empty-state">設定チェックに失敗しました。Vercelへデプロイ後にもう一度確認してください。</div>`;
  }
}

function renderHealthCheck(result) {
  if (!els.healthCheckOutput) return;
  const checkedAt = result.checkedAt ? formatBackupDate(result.checkedAt) : "未確認";
  const checks = result.checks || [];
  els.healthCheckOutput.innerHTML = `
    <div class="health-summary ${result.ok ? "ok" : "warn"}">
      <strong>${result.ok ? "本番設定OK" : "未設定または未接続があります"}</strong>
      <span>${escapeHtml(checkedAt)}</span>
    </div>
    <div class="health-check-list">
      ${checks.map((item) => `
        <article class="health-check-item ${item.ok ? "ok" : "warn"}">
          <span>${item.ok ? "OK" : "要確認"}</span>
          <div><strong>${escapeHtml(item.label || item.key)}</strong><p>${escapeHtml(item.detail || "")}</p></div>
        </article>
      `).join("")}
    </div>
  `;
}

function runDataAudit() {
  if (!els.dataAuditOutput) return;
  const findings = auditTournamentData();
  renderDataAudit(findings);
}

function auditTournamentData() {
  const findings = [];
  const tournamentItems = state.tournaments || [];
  const accountProfiles = Object.values(accounts || {}).map((account) => account.profile).filter(Boolean);

  if (!tournamentItems.length && !hasTournament()) {
    findings.push({
      level: "warn",
      title: "大会が未作成",
      detail: "正式公開前にテスト大会を1つ作り、エントリーから終了まで通し確認してください。",
    });
  }

  const seenTournamentIds = new Set();
  tournamentItems.forEach((item) => {
    if (!item.id) {
      findings.push({ level: "warn", title: "大会IDなし", detail: `${item.tournament?.name || "無題の大会"} にIDがありません。` });
      return;
    }
    if (seenTournamentIds.has(item.id)) findings.push({ level: "error", title: "大会ID重複", detail: `${item.tournament?.name || item.id} のIDが重複しています。` });
    seenTournamentIds.add(item.id);
    auditTournamentItem(item, findings);
  });

  if (hasTournament() && !tournamentItems.some((item) => item.id === state.activeTournamentId)) {
    findings.push({
      level: "warn",
      title: "選択中大会が一覧に同期されていない",
      detail: "画面を再描画するか、大会情報を保存して同期してください。",
    });
  }

  const duplicateLoginIds = findDuplicates(Object.keys(accounts || {}).map((key) => key.toLowerCase()));
  duplicateLoginIds.forEach((loginId) => findings.push({ level: "warn", title: "ログインID重複", detail: `${loginId} が重複しています。` }));

  const profilesMissingRiot = accountProfiles.filter((profile) => !profile.riotId || !String(profile.riotId).includes("#"));
  if (profilesMissingRiot.length) {
    findings.push({
      level: "warn",
      title: "Riot ID未完成のアカウント",
      detail: `${profilesMissingRiot.length}件あります。サモナーネームとタグを確認してください。`,
    });
  }

  if (!findings.length) {
    findings.push({
      level: "ok",
      title: "重大な問題なし",
      detail: "現在の大会データに、運用を止めるような整合性エラーは見つかりませんでした。",
    });
  }

  return findings;
}

function auditTournamentItem(item, findings) {
  const tournament = item.tournament || {};
  const players = item.players || [];
  const lobbies = item.lobbies || [];
  const results = item.results || {};
  const playerIds = players.map((player) => player.id).filter(Boolean);
  const duplicatePlayers = findDuplicates(playerIds);

  if (!tournament.name) findings.push({ level: "warn", title: "大会名未設定", detail: "大会名が空の大会があります。" });
  if (!tournament.startAt) findings.push({ level: "warn", title: "開始日時未設定", detail: `${tournament.name || "無題の大会"} の開始日時が未設定です。` });
  if (duplicatePlayers.length) {
    findings.push({
      level: "error",
      title: "参加者ID重複",
      detail: `${tournament.name || "無題の大会"} に重複IDがあります: ${duplicatePlayers.join(", ")}`,
    });
  }

  const missingRiot = players.filter((player) => !player.riotId || !String(player.riotId).includes("#"));
  if (missingRiot.length) {
    findings.push({
      level: "warn",
      title: "招待に必要なRiot ID不足",
      detail: `${tournament.name || "無題の大会"} に ${missingRiot.length}名あります。`,
    });
  }

  if (["ready", "live", "finished"].includes(tournament.status) && !tournament.checkInFinalizedAt) {
    findings.push({
      level: "warn",
      title: "チェックインリスト未確定",
      detail: `${tournament.name || "無題の大会"} は開始確認以降ですが、チェックイン確定時刻がありません。`,
    });
  }

  if (tournament.status === "live") {
    const blocks = getLobbyBlocksForTournament(tournament);
    blocks.forEach((block, index) => {
      const hasLobby = Boolean(lobbies[index]?.length);
      const previousComplete = index === 0 || blockGamesComplete(blocks[index - 1], results);
      if (hasLobby && !previousComplete) {
        findings.push({
          level: "error",
          title: "ロビー先行生成",
          detail: `${tournament.name || "無題の大会"} の${block.games.join(", ")}試合目ロビーが前ブロック完了前に生成されています。`,
        });
      }
    });
  }

  Object.entries(results || {}).forEach(([gameNo, placements]) => {
    const placementsValues = Object.values(placements || {}).map(Number).filter(Boolean);
    const duplicatePlacements = findDuplicates(placementsValues);
    if (duplicatePlacements.length) {
      findings.push({
        level: "error",
        title: "同一試合内の着順重複",
        detail: `${tournament.name || "無題の大会"} Game ${gameNo} に重複着順があります: ${duplicatePlacements.join(", ")}`,
      });
    }
  });
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  });
  return [...duplicates];
}

function getLobbyBlocksForTournament(tournament) {
  if (tournament?.lobbyRule === "everyGame") {
    return [1, 2, 3, 4, 5, 6].map((game) => ({ label: `Game ${game}`, games: [game] }));
  }
  return BLOCKS;
}

function blockGamesComplete(block, results) {
  return (block?.games || []).every((gameNo) => Object.keys(results?.[gameNo] || {}).length > 0);
}

function renderDataAudit(findings) {
  if (!els.dataAuditOutput) return;
  const issueCount = findings.filter((item) => item.level !== "ok").length;
  els.dataAuditOutput.innerHTML = `
    <div class="health-summary ${issueCount ? "warn" : "ok"}">
      <strong>${issueCount ? `${issueCount}件の確認項目があります` : "データ整合性OK"}</strong>
      <span>${escapeHtml(formatBackupDate(new Date().toISOString()))}</span>
    </div>
    <div class="health-check-list">
      ${findings.map((item) => `
        <article class="health-check-item ${item.level === "ok" ? "ok" : "warn"} ${item.level === "error" ? "error" : ""}">
          <span>${item.level === "ok" ? "OK" : item.level === "error" ? "修正" : "確認"}</span>
          <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div>
        </article>
      `).join("")}
    </div>
  `;
}

async function restoreStateBackup(backupId) {
  if (!backupId) return;
  const ok = confirm(`バックアップID ${backupId} の状態に共有データを戻します。\n現在の共有データも復旧前に自動バックアップされます。`);
  if (!ok) return;
  const result = await requestStateBackups("restore", { id: backupId });
  if (!result?.data) return;
  state = { ...defaultState(), ...result.data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notify("復旧完了", "バックアップから復旧しました。画面を更新します。", "success");
  location.reload();
}

function render() {
  applyTournamentAutomation();
  if (["ready", "live"].includes(state.tournament?.status) && !state.tournament?.checkInFinalizedAt) {
    finalizeCheckInList();
  }
  prunePrematureLobbies();
  if (hasTournament()) syncActiveTournament();
  ensureActiveHomeTournament();
  renderHome();
  renderPastTournaments();
  renderAuthMode();
  renderReportSelectors();
  renderMyPage();
  renderAdmin();
  renderSupportContact();
  renderTopActions();
  saveState();
}

function renderTopActions() {
  els.logoutTopBtn.classList.toggle("hidden", !currentProfile);
  const canReport = Boolean(getCurrentReportTarget());
  els.reportNavBtn.classList.toggle("hidden", !canReport);
  renderMyPageGlobalAlert();
}

function renderMyPageGlobalAlert() {
  const player = getPlayer(currentUserId);
  const profile = currentProfile || player;
  const alerts = [...getTournamentAlerts(player), ...getAccountAlerts(profile)];
  const primary = alerts[0];
  const topLabel = els.myPageTopBtn?.querySelector(".top-alert-label");
  const mobileDot = document.querySelector(".mobile-nav-button[data-go='mypage'] .top-alert-dot");
  if (topLabel) {
    topLabel.classList.toggle("hidden", !primary);
    topLabel.textContent = primary?.badge || "";
  }
  if (mobileDot) {
    mobileDot.classList.toggle("hidden", !primary);
  }
  const title = primary ? `${primary.badge}: ${primary.text}` : "マイページ";
  els.myPageTopBtn?.setAttribute("title", title);
  document.querySelector(".mobile-nav-button[data-go='mypage']")?.setAttribute("title", title);
}

function renderAuthMode() {
  document.querySelectorAll(".auth-mode").forEach((button) => button.classList.toggle("active", button.dataset.authMode === authMode));
  const isRegister = authMode === "register";
  els.authProfileFields.classList.toggle("hidden", !isRegister);
  els.authSubmitBtn.textContent = isRegister ? "新規登録" : "ログイン";
  els.authHelpText.textContent = isRegister
    ? "新規登録では大会運営に必要な表示名、Riot ID、Discord IDを登録します。"
    : "既存アカウントはユーザー名またはメールアドレスとパスワードだけでログインできます。";
}

function go(screenId) {
  if (!currentProfile && screenId !== "opening") screenId = "opening";
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === screenId));
  if (location.hash !== `#${screenId}`) location.hash = screenId;
}

function renderHome() {
  renderTournamentCarousel();
  const hasVisibleTournament = hasTournament() && state.tournament.status !== "finished";
  if (!hasVisibleTournament) {
    els.publicTournamentName.textContent = "受付中・進行中の大会はありません";
    els.publicTournamentSummary.textContent = "終了した大会は過去大会から最終順位を確認できます。新しい大会が作成されるとここに表示されます。";
    els.publicStatusBadge.textContent = "大会なし";
    els.publicStatusBadge.dataset.status = "empty";
    els.tournamentCard.dataset.status = "empty";
    els.tournamentCard.dataset.theme = "empty";
    els.publicStartAt.textContent = "-";
    els.publicFormatName.textContent = "-";
    els.dialogTournamentName.textContent = "開催予定の大会はありません";
    els.dialogStatus.textContent = "準備中";
    els.dialogStartAt.textContent = "-";
    els.dialogFormatName.textContent = "-";
    els.dialogLobbyRule.textContent = "-";
    els.dialogEntryBtn.classList.add("hidden");
    els.dialogReportBtn.classList.add("hidden");
    els.publicFormatDetails.classList.add("hidden");
    els.publicTimelineDetails.classList.add("hidden");
    els.homePlayerCount.textContent = "0";
    els.homeSubCount.textContent = "0";
    els.homeCompletedGames.textContent = "0/6";
    renderPublicPlayers([], []);
    renderPublicStandings("none");
    renderPublicLobbies("none");
    renderEntryCta("none");
    return;
  }
  const mainPlayers = state.players.filter((player) => !player.isSubstitute);
  const subs = state.players.filter((player) => player.isSubstitute);
  const status = state.tournament.status || "entry";
  els.tournamentCard.dataset.theme = tournamentTheme(state.activeTournamentId);
  els.publicTournamentName.textContent = state.tournament.name || "SPACE GODS CUP";
  els.publicTournamentSummary.textContent = `${statusMessage(status)} ログインしたら1タップで参戦。始まったら自分のテーブルと全体順位をすぐ確認できます。`;
  els.publicStatusBadge.textContent = statusLabel(status);
  els.publicStatusBadge.dataset.status = status;
  els.tournamentCard.dataset.status = status;
  els.publicStartAt.textContent = formatStartAt(state.tournament.startAt);
  els.publicFormatName.textContent = formatTypeLabel(state.tournament.formatType);
  els.dialogTournamentName.textContent = state.tournament.name || "SPACE GODS CUP";
  els.dialogStatus.textContent = statusLabel(status);
  els.dialogStartAt.textContent = formatStartAt(state.tournament.startAt);
  els.dialogFormatName.textContent = formatTypeLabel(state.tournament.formatType);
  els.dialogLobbyRule.textContent = lobbyRuleLabel(state.tournament.lobbyRule || defaultLobbyRuleForFormat(state.tournament.formatType));
  const isEntered = Boolean(getPlayer(currentUserId));
  els.dialogEntryBtn.classList.toggle("hidden", status !== "entry" && !isEntered);
  els.dialogEntryBtn.textContent = isEntered ? "マイページで確認" : "エントリーする";
  els.dialogReportBtn.classList.toggle("hidden", status !== "live");
  els.publicFormatDetails.classList.add("hidden");
  els.publicTimelineDetails.classList.add("hidden");
  els.dialogDetailToggle.textContent = "大会詳細";
  els.dialogTimelineToggle.textContent = "タイムライン";
  renderPublicFormatDetails();
  renderPublicTimelineDetails();
  els.homePlayerCount.textContent = `${mainPlayers.length}/${state.tournament.maxPlayers || 256}`;
  els.homeSubCount.textContent = subs.length;
  els.homeCompletedGames.textContent = `${countCompletedGames()}/6`;
  renderPublicPlayers(mainPlayers, subs);
  renderPublicStandings(status);
  renderPublicLobbies(status);
  renderEntryCta(status);
  maybeShowCheckInDialog();
}

function renderTournamentCarousel() {
  if (!els.tournamentCarousel) return;
  const tournaments = visibleHomeTournaments();
  if (!tournaments.length) {
    els.tournamentCarousel.innerHTML = `
      <div class="carousel-head">
        <div>
          <p class="eyebrow">Tournaments</p>
          <h2>受付中・進行中の大会はありません</h2>
        </div>
        <button class="carousel-archive-link" type="button" data-go="past">過去大会</button>
      </div>
    `;
    return;
  }
  els.tournamentCarousel.innerHTML = `
    <div class="carousel-head">
      <div>
        <p class="eyebrow">Tournaments</p>
        <h2>大会を選択</h2>
      </div>
      <div class="carousel-actions">
        <span>${tournaments.length}件</span>
        <button class="carousel-archive-link" type="button" data-go="past">過去大会</button>
      </div>
    </div>
    <div class="tournament-slide-row">
      ${tournaments.map((item, index) => {
        const tournament = item.tournament || {};
        const players = item.players || [];
        const mainCount = players.filter((player) => !player.isSubstitute).length;
        const isActive = item.id === state.activeTournamentId;
        return `
          <button class="tournament-slide ${isActive ? "active" : ""}" type="button" data-tournament-id="${escapeHtml(item.id)}" data-theme="${tournamentTheme(item.id)}">
            <span class="slide-status" data-status="${escapeHtml(tournament.status || "entry")}">${escapeHtml(statusLabel(tournament.status || "entry"))}</span>
            <strong>${escapeHtml(tournament.name || "無題の大会")}</strong>
            <small>${escapeHtml(formatStartAt(tournament.startAt))}</small>
            <em>${escapeHtml(formatTypeLabel(tournament.formatType))}</em>
            <i>${mainCount}/${tournament.maxPlayers || 256} エントリー</i>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function tournamentTheme(tournamentId) {
  const index = Math.max(0, (state.tournaments || []).findIndex((item) => item.id === tournamentId));
  return ["cosmic", "solar", "aqua", "ember", "violet"][index % 5];
}

function renderPastTournaments() {
  if (!els.pastTournamentsList) return;
  const past = (state.tournaments || []).filter((item) => item.tournament?.status === "finished");
  if (!past.length) {
    els.pastTournamentsList.innerHTML = `<div class="empty-state">終了した大会はまだありません。</div>`;
    return;
  }
  els.pastTournamentsList.innerHTML = past.map((item) => {
    const tournament = item.tournament || {};
    const standings = calculateTournamentStandings(item).slice(0, 16);
    const completedGames = [1, 2, 3, 4, 5, 6].filter((gameNo) => {
      const values = Object.values(item.results?.[gameNo] || {}).filter(Boolean);
      const mainCount = (item.players || []).filter((player) => !player.isSubstitute).length;
      return values.length === mainCount && values.length > 0;
    }).length;
    return `
      <article class="past-tournament-card" data-theme="${tournamentTheme(item.id)}">
        <div class="past-tournament-head">
          <div>
            <span>${escapeHtml(formatStartAt(tournament.startAt))}</span>
            <strong>${escapeHtml(tournament.name || "無題の大会")}</strong>
            <small>${escapeHtml(formatTypeLabel(tournament.formatType))} / ${completedGames}/6 完了</small>
          </div>
          <span class="archive-chip">最終順位</span>
        </div>
        <div class="past-final-standings">
          ${standings.length ? standings.map((row, index) => `
            <div class="${row.player.id === currentUserId ? "is-current" : ""}">
              <b>${index + 1}</b>
              <span>${escapeHtml(row.player.displayName)}</span>
              <strong>${row.points}pt</strong>
            </div>
          `).join("") : `<div class="empty-state">順位データはありません。</div>`}
        </div>
      </article>
    `;
  }).join("");
}

function renderEntryCta(status) {
  const user = getPlayer(currentUserId);
  const loggedIn = Boolean(currentProfile);
  const canEnter = status === "entry";
  const checkInState = checkInWindowState();
  els.entryCtaPanel.dataset.status = status;
  els.homeCheckInBtn.classList.add("hidden");
  renderEntryCtaSteps(status, user, checkInState, loggedIn);
  if (!hasTournament()) {
    els.entryCtaTitle.textContent = "大会開催待ち";
    els.entryCtaText.textContent = "現在エントリーできる大会はありません。大会が作成されるとここから参加できます。";
    els.homeEntryBtn.textContent = "受付前";
    els.homeEntryBtn.disabled = true;
    return;
  }
  if (!loggedIn) {
    els.entryCtaTitle.textContent = "まずはTFTRiseにログイン";
    els.entryCtaText.textContent = "アカウントを作れば、次から大会エントリーもチェックインも迷わず進めます。";
    els.homeEntryBtn.textContent = "ログインへ";
    els.homeEntryBtn.disabled = false;
    return;
  }
  if (user) {
    if (user.didNotCheckIn && ["ready", "live", "finished"].includes(status)) {
      els.entryCtaTitle.textContent = "チェックイン未完了";
      els.entryCtaText.textContent = `${user.displayName} はチェックイン締切までに確認できなかったため、この大会は自動キャンセル扱いになりました。`;
      els.homeEntryBtn.textContent = "マイページで確認";
      els.homeEntryBtn.disabled = false;
      els.homeCheckInBtn.classList.add("hidden");
      return;
    }
    els.entryCtaTitle.textContent = status === "checkin" ? "チェックイン受付中" : "エントリー済み";
    els.entryCtaText.textContent = user.checkedInAt
      ? `${user.displayName} としてチェックイン済みです。`
      : status === "checkin"
        ? `${user.displayName} としてエントリー済みです。参加する場合はチェックインしてください。`
        : `${user.displayName} としてこの大会に参加登録済みです。${checkInState.message}`;
    els.homeEntryBtn.textContent = "マイページへ";
    els.homeEntryBtn.disabled = false;
    els.homeCheckInBtn.classList.toggle("hidden", checkInState.state !== "open" || Boolean(user.checkedInAt));
    return;
  }
  if (status === "checkin") {
    els.entryCtaTitle.textContent = user ? "チェックイン受付中" : "チェックイン受付中";
    els.entryCtaText.textContent = user
      ? `${user.displayName} としてエントリー済みです。参加する場合はチェックインしてください。`
      : "エントリー受付は終了しました。参加登録済みの選手だけチェックインできます。";
    els.homeEntryBtn.textContent = user ? "マイページで確認" : "受付終了";
    els.homeEntryBtn.disabled = !user;
    els.homeCheckInBtn.classList.toggle("hidden", !user || checkInState.state !== "open" || Boolean(user.checkedInAt));
    return;
  }
  if (status === "ready") {
    els.entryCtaTitle.textContent = "大会開始待ち";
    els.entryCtaText.textContent = "チェックイン受付は終了しました。運営の開始確認後に大会が始まります。";
    els.homeEntryBtn.textContent = user ? "マイページで確認" : "受付終了";
    els.homeEntryBtn.disabled = !user;
    return;
  }
  if (!canEnter) {
    els.entryCtaTitle.textContent = "エントリー受付外";
    els.entryCtaText.textContent = "この大会は現在エントリーを受け付けていません。";
    els.homeEntryBtn.textContent = "受付外";
    els.homeEntryBtn.disabled = true;
    return;
  }
  els.entryCtaTitle.textContent = "この大会に挑戦する";
  els.entryCtaText.textContent = `${currentProfile.displayName} として準備OK。1タップで参戦できます。`;
  els.homeEntryBtn.textContent = "今すぐエントリー";
  els.homeEntryBtn.disabled = false;
}

function renderEntryCtaSteps(status, user, checkInState, loggedIn) {
  if (!els.entryCtaSteps) return;
  const reportTarget = getCurrentReportTarget();
  const lobbyEntry = user ? findCurrentLobbyEntry(user.id) : null;
  const currentKey = (() => {
    if (!hasTournament()) return "wait";
    if (!loggedIn) return "login";
    if (!user) return status === "entry" ? "entry" : "closed";
    if (checkInState.state === "open" && !user.checkedInAt) return "checkin";
    if (status === "live" && reportTarget) return "report";
    if (status === "live" && lobbyEntry) return "table";
    if (status === "ready") return "ready";
    if (status === "finished") return "done";
    return "standby";
  })();
  const done = {
    login: loggedIn,
    entry: Boolean(user),
    checkin: Boolean(user?.checkedInAt),
    table: Boolean(lobbyEntry),
    report: Boolean(reportTarget && state.results?.[reportTarget.game]?.[currentUserId]),
  };
  const steps = [
    { key: "login", label: "ログイン", done: done.login },
    { key: "entry", label: "エントリー", done: done.entry },
    { key: "checkin", label: "チェックイン", done: done.checkin },
    { key: "table", label: "テーブル確認", done: done.table },
    { key: "report", label: "結果報告", done: done.report },
  ];
  els.entryCtaSteps.innerHTML = steps.map((step) => `
    <span class="${step.done ? "done" : ""} ${step.key === currentKey ? "current" : ""}">
      <b>${step.done ? "✓" : ""}</b>${escapeHtml(step.label)}
    </span>
  `).join("");
  els.entryCtaPanel.dataset.next = currentKey;
}

function renderPublicFormatDetails() {
  const formatType = state.tournament?.formatType || "sixGame";
  const lobbyRule = state.tournament?.lobbyRule || defaultLobbyRuleForFormat(formatType);
  const maxPlayers = Number(state.tournament?.maxPlayers || 256);
  const progress = formatProgressInfo(formatType);
  els.publicFormatDetails.innerHTML = "";
  const overview = document.createElement("section");
  overview.className = "format-overview";
  overview.innerHTML = `
    <article class="format-overview-card primary">
      <span>形式</span>
      <strong>${escapeHtml(formatTypeLabel(formatType))}</strong>
      <p>${escapeHtml(progress.summary)}</p>
    </article>
    <article class="format-overview-card">
      <span>進行タイプ</span>
      <strong>${escapeHtml(progress.type)}</strong>
      <p>${escapeHtml(progress.detail)}</p>
    </article>
    <article class="format-overview-card">
      <span>得点</span>
      <strong>1位8pt - 8位1pt</strong>
      <p>各試合の着順でptを付与。同点時は1位率、Top4率、平均着順の順で総合順位を算出します。</p>
    </article>
    <article class="format-overview-card">
      <span>参加枠</span>
      <strong>最大${escapeHtml(maxPlayers)}名</strong>
      <p>定員を超えたエントリーは補欠として管理されます。</p>
    </article>
    <article class="format-overview-card">
      <span>ロビー抽選</span>
      <strong>${escapeHtml(lobbyRuleLabel(lobbyRule))}</strong>
      <p>${escapeHtml(lobbyRule === "everyGame" ? "各試合ごとに全テーブルを再抽選します。" : "2試合ごとにテーブルを再抽選します。")}</p>
    </article>
  `;
  els.publicFormatDetails.append(overview);

  const scoreList = document.createElement("section");
  scoreList.className = "score-detail-strip";
  scoreList.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((place) => `<span><b>${place}位</b>${scoreForPlacement(place)}pt</span>`)
    .join("");
  els.publicFormatDetails.append(scoreList);

  const contact = supportContactInfo();
  const contactSection = document.createElement("section");
  contactSection.className = "support-contact-card";
  contactSection.innerHTML = `
    <div>
      <span>Support</span>
      <strong>困った時の連絡先</strong>
      <p>${escapeHtml(contact.help)}</p>
    </div>
    ${contact.url
      ? `<a class="secondary-button" href="${escapeHtml(contact.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.label)}</a>`
      : `<span class="support-contact-muted">${escapeHtml(contact.label)}</span>`}
  `;
  els.publicFormatDetails.append(contactSection);

  if (formatType === "multiDay") {
    const tpc = document.createElement("section");
    tpc.className = "tpc-format-flow";
    tpc.innerHTML = `
      <article><span>Day 1</span><strong>32人 → 24人</strong><p>4ロビーで6試合。2試合ごとに再抽選し、下位8人をカット。</p></article>
      <article><span>Day 2</span><strong>24人 → 8人</strong><p>Match 1-2は3ロビー、Match 3-4は2ロビー、Match 5-6は1ロビー。合計16人をカットし、上位8人が決勝へ。</p></article>
      <article><span>Day 3 Final</span><strong>チェックメイト20pt</strong><p>8人1ロビー。20pt到達後に1位を取った選手が優勝。優勝者確定後、最終順位を確定。</p></article>
    `;
    els.publicFormatDetails.append(tpc);
  }
}

function supportContactInfo() {
  const label = state.tournament?.contactLabel || "運営への連絡";
  const url = normalizeUrlInput(state.tournament?.contactUrl || "");
  return {
    label,
    url,
    help: url
      ? "ロビー、チェックイン、結果報告で困った場合は、こちらから運営へ連絡してください。"
      : "連絡先URLはまだ設定されていません。大会内の案内または運営の告知を確認してください。",
  };
}

function renderSupportContact() {
  if (!els.supportContactOutput) return;
  const contact = supportContactInfo();
  els.supportContactOutput.innerHTML = `
    <div class="support-contact-card compact">
      <div>
        <span>Contact</span>
        <strong>${escapeHtml(contact.label)}</strong>
        <p>${escapeHtml(contact.help)}</p>
      </div>
      ${contact.url
        ? `<a class="secondary-button" href="${escapeHtml(contact.url)}" target="_blank" rel="noopener noreferrer">連絡先を開く</a>`
        : `<span class="support-contact-muted">未設定</span>`}
    </div>
  `;
}

function normalizeUrlInput(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatProgressInfo(formatType) {
  return {
    sixGame: {
      type: "1日完結 / 6戦総合pt",
      summary: "8〜256人まで対応し、6戦の合計ptで順位を決めます。",
      detail: "ロビー抽選の頻度を選べる基本形式です。2戦ごとならスイス式運用、毎試合なら完全再抽選運用になります。",
    },
    oneDayElim: {
      type: "鰹節杯ルール / 勝ち上がり",
      summary: "256→128→64→32→16→決勝の流れで進行します。",
      detail: "各ラウンドでロビーを再抽選し、上位者が次へ進みます。",
    },
    multiDay: {
      type: "TPC式 Day制 / 決勝チェックメイト",
      summary: "Day1 32人、Day2 24人、Day3 8人決勝で進行します。",
      detail: "Day3決勝は20pt到達後に1位を取った選手が優勝するチェックメイト方式です。",
    },
    custom: {
      type: "カスタム形式",
      summary: "運営が設定した大会詳細に沿って進行します。",
      detail: "特殊ルールや招待制大会などに使います。",
    },
  }[formatType] || {
    type: "1日完結 / 6戦総合pt",
    summary: "6戦の合計ptで順位を決めます。",
    detail: "基本形式です。",
  };
}

function renderPublicTimelineDetails() {
  const timeline = buildTournamentTimeline();
  const section = document.createElement("section");
  section.className = "tournament-timeline";
  section.innerHTML = `
    <div class="timeline-head">
      <span>Schedule</span>
      <strong>大会進行タイムライン</strong>
    </div>
  `;
  if (!timeline.length) {
    section.insertAdjacentHTML("beforeend", `<div class="empty-state">開始日時を設定すると、エントリー締切から6試合終了までの目安が表示されます。</div>`);
    els.publicTimelineDetails.innerHTML = "";
    els.publicTimelineDetails.append(section);
    return;
  }
  const list = document.createElement("ol");
  timeline.forEach((item) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <time>${escapeHtml(item.time)}</time>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    `;
    list.append(row);
  });
  section.append(list);
  els.publicTimelineDetails.innerHTML = "";
  els.publicTimelineDetails.append(section);
}

function renderEntryNoticeTimeline() {
  const timeline = buildTournamentTimeline();
  els.entryNoticeTimeline.innerHTML = `
    <div class="notice-timeline-head">
      <span>必ず確認</span>
      <strong>大会タイムライン</strong>
    </div>
  `;
  if (!timeline.length) {
    els.entryNoticeTimeline.insertAdjacentHTML("beforeend", `<div class="empty-state">開始日時が未設定です。運営からの案内を確認してください。</div>`);
    return;
  }
  const list = document.createElement("ol");
  timeline.forEach((item) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <time>${escapeHtml(item.time)}</time>
      <span>${escapeHtml(item.title)}</span>
    `;
    list.append(row);
  });
  els.entryNoticeTimeline.append(list);
}

function buildTournamentTimeline() {
  if (!state.tournament?.startAt) return [];
  const gameOneStart = new Date(state.tournament.startAt);
  if (Number.isNaN(gameOneStart.getTime())) return [];
  const checkInStart = addMinutes(gameOneStart, -30);
  const games = [1, 2, 3, 4, 5, 6].map((gameNo) => {
    const start = addMinutes(gameOneStart, (gameNo - 1) * 60);
    const end = addMinutes(start, 50);
    return {
      time: formatTimelineRange(start, end),
      title: `Game ${gameNo}`,
      detail: gameNo < 6 ? "試合50分、終了後10分休憩。次の試合は1時間後に開始予定です。" : "最終戦です。終了後、総合順位を確定します。",
    };
  });
  return [
    {
      time: `〜 ${formatTimelineDateTime(checkInStart)}`,
      title: "エントリー締切",
      detail: "この時刻までにエントリーを完了してください。以降は新規エントリーとキャンセルはできません。",
    },
    {
      time: formatTimelineRange(checkInStart, gameOneStart),
      title: "チェックイン",
      detail: "エントリー済みの選手だけがチェックインできます。30分間の受付です。",
    },
    ...games,
  ];
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatTimelineDateTime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimelineTime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimelineRange(start, end) {
  return `${formatTimelineDateTime(start)} - ${formatTimelineTime(end)}`;
}

function renderPublicPlayers(mainPlayers, subs) {
  els.publicPlayersList.innerHTML = "";
  if (!state.players.length) {
    els.publicPlayersList.innerHTML = `<div class="empty-state">まだエントリーはありません。</div>`;
    return;
  }

  [
    ["参加者", mainPlayers],
    ["補欠", subs],
  ].forEach(([label, players]) => {
    if (!players.length) return;
    const section = document.createElement("section");
    section.className = "public-player-group";
    section.innerHTML = `<h3>${label}</h3>`;
    const list = document.createElement("div");
    list.className = "public-player-grid";
    players.forEach((player) => {
      const item = document.createElement("article");
      const isCurrentPlayer = Boolean(currentUserId && player.id === currentUserId);
      item.className = `public-player-card ${isCurrentPlayer ? "is-current" : ""}`;
      const selectedTitleName = REWARD_TITLES.find((title) => title.id === player.selectedTitle)?.name || "";
      item.innerHTML = `
        <div class="public-player-avatar-wrap ${player.avatarFrame ? `frame-${escapeHtml(player.avatarFrame)}` : ""}">
          <img class="public-player-avatar" src="${escapeHtml(getDisplayAvatar(player))}" alt="" />
        </div>
        <div class="public-player-info">
          <div class="public-player-name-line">
            <strong>${escapeHtml(player.displayName)}</strong>
            ${isCurrentPlayer ? `<b>YOU</b>` : ""}
          </div>
          <span>${escapeHtml(player.riotId || "Riot ID未入力")}</span>
          ${selectedTitleName ? `<em>${escapeHtml(selectedTitleName)}</em>` : ""}
        </div>
      `;
      list.append(item);
    });
    section.append(list);
    els.publicPlayersList.append(section);
  });
}

function renderPublicStandings(status) {
  if (status !== "live") {
    els.publicStandingsPanel.classList.add("hidden");
    els.publicStandingsList.innerHTML = "";
    return;
  }

  const standings = calculateStandings();
  els.publicStandingsPanel.classList.remove("hidden");
  if (!standings.length) {
    els.publicStandingsList.innerHTML = `<div class="empty-state">まだ順位データはありません。1試合目の結果報告後に反映されます。</div>`;
    return;
  }

  const currentIndex = standings.findIndex((row) => row.player.id === currentUserId);
  const topRows = standings.slice(0, 10);
  const currentRow = currentIndex >= 10 ? standings[currentIndex] : null;
  const rows = currentRow ? [...topRows, currentRow] : topRows;
  els.publicStandingsList.innerHTML = rows
    .map((row, index) => {
      const rank = row === currentRow ? currentIndex + 1 : index + 1;
      const isMe = row.player.id === currentUserId;
      const marker = row === currentRow ? `<span class="standing-separator">あなたの現在地</span>` : "";
      return `${marker}<article class="public-standing-row ${isMe ? "is-me" : ""}">
        <span class="standing-rank">${rank}</span>
        <strong>${escapeHtml(row.player.displayName)}</strong>
        <small>${escapeHtml(row.player.riotId || "Riot ID未入力")}</small>
        <b>${row.points}pt</b>
      </article>`;
    })
    .join("");
}

function renderPublicLobbies(status) {
  const shouldShow = ["ready", "live"].includes(status) && (state.lobbies || []).some((block) => block?.length);
  els.publicLobbyPanel.classList.toggle("hidden", !shouldShow);
  els.publicLobbyList.innerHTML = "";
  if (!shouldShow) return;

  getLobbyBlocks().forEach((block, blockIndex) => {
    const lobbies = state.lobbies[blockIndex] || [];
    if (!lobbies.length) return;
    const section = document.createElement("section");
    section.className = "public-lobby-block";
    section.innerHTML = `<h3>${escapeHtml(block.label)}</h3>`;
    const grid = document.createElement("div");
    grid.className = "public-lobby-grid";
    lobbies.forEach((lobby, lobbyIndex) => {
      const hostId = state.lobbyHosts?.[blockIndex]?.[lobbyIndex] || "";
      const card = document.createElement("article");
      card.className = "public-lobby-card";
      card.innerHTML = `
        <div class="public-lobby-card-head">
          <strong>Lobby ${lobbyIndex + 1}</strong>
          <span>開設者: ${escapeHtml(getPlayer(hostId)?.displayName || "未割り当て")}</span>
        </div>
        <ol>
          ${lobby.map((playerId) => {
            const player = getPlayer(playerId);
            if (!player) return "";
            return `<li class="${player.id === currentUserId ? "is-current" : ""}">
              ${playerRiotDisplayMarkup(player)}
            </li>`;
          }).join("")}
        </ol>
      `;
      grid.append(card);
    });
    section.append(grid);
    els.publicLobbyList.append(section);
  });
}

function renderReportSelectors() {
  const target = getCurrentReportTarget();
  els.reportGame.value = target?.game ? String(target.game) : "";
  els.reportLobby.value = target?.lobbyIndex >= 0 ? String(target.lobbyIndex) : "";
  els.reportTargetSummary.textContent = target
    ? `Game ${target.game} / Lobby ${target.lobbyIndex + 1}`
    : "あなたの報告対象ロビーはまだありません";
  renderReportGate(target);
  renderReportSubmitter();
  renderManualFallback();
}

function renderReportGate(target) {
  const locked = !target;
  els.reportGate.classList.toggle("hidden", !locked);
  els.reportGate.textContent = locked
    ? "報告できるロビーがまだありません。大会開始後、管理側がロビーを生成すると自動で表示されます。"
    : "";
  [els.reportImage, els.analyzeReportBtn, els.submitOcrBtn, els.submitManualBtn].forEach((control) => {
    control.disabled = locked;
  });
}

function renderReportSubmitter() {
  const player = getPlayer(currentUserId);
  const profile = player || currentProfile;
  els.reportSubmitterName.textContent = profile?.displayName
    ? `${profile.displayName} として提出`
    : "ログイン中のアカウントを使用";
}

function getCurrentReportTarget() {
  if (!currentUserId || !hasTournament()) return null;
  for (const game of [1, 2, 3, 4, 5, 6]) {
    const blockIndex = getBlockIndex(game);
    const lobbies = state.lobbies[blockIndex] || [];
    const lobbyIndex = lobbies.findIndex((lobby) => lobby.includes(currentUserId));
    if (lobbyIndex < 0) continue;
    const lobby = lobbies[lobbyIndex];
    const results = state.results[game] || {};
    const completed = lobby.length && lobby.every((playerId) => results[playerId]);
    if (hasSubmittedReportForGameLobby(game, lobbyIndex + 1)) continue;
    if (!completed) return { game, blockIndex, lobbyIndex, lobby };
  }
  return null;
}

function hasSubmittedReportForGameLobby(gameNo, lobbyNo) {
  return (state.reports || []).some((report) => (
    report.status !== "rejected"
    && Number(report.game) === Number(gameNo)
    && Number(report.lobby) === Number(lobbyNo)
  ));
}

function renderMyPage() {
  if (location.hash === "#mypage") ensureActiveTournamentForMyPage();
  const playerId = currentUserId;
  const profile = currentProfile || getPlayer(playerId);
  if (!profile) {
    els.mySummary.innerHTML = `<div class="empty-state">ログインするとマイページを確認できます。</div>`;
    els.myNextAction.innerHTML = "";
    els.myEntryActions.innerHTML = "";
    els.myProfileOutput.innerHTML = "";
    els.myLobbyOutput.innerHTML = "";
    els.myHistoryOutput.innerHTML = "";
    els.myPastResultsOutput.innerHTML = "";
    renderMyPageTabs(null, null);
    return;
  }

  const player = getPlayer(playerId);
  if (!player) {
    els.mySummary.innerHTML = `
      <article><span>選手</span><strong>${escapeHtml(profile.displayName || "-")}</strong></article>
      <article><span>状態</span><strong>未エントリー</strong></article>
    `;
    renderMyProfile(profile);
    renderNextAction(null);
    els.myEntryActions.innerHTML = "";
    els.myLobbyOutput.innerHTML = "";
    els.myHistoryOutput.innerHTML = `<div class="empty-state">大会ポップからエントリーすると、この大会の成績が表示されます。</div>`;
    renderPastResults(profile);
    renderMyPageTabs(profile, null);
    return;
  }
  const history = [1, 2, 3, 4, 5, 6].map((gameNo) => Number(state.results[gameNo]?.[playerId] || 0));
  const points = history.reduce((sum, placement) => sum + scoreForPlacement(placement), 0);
  const played = history.filter(Boolean).length;
  const standing = calculateStandings().findIndex((row) => row.player.id === playerId) + 1;
  const standingText = played || ["live", "finished"].includes(state.tournament?.status) ? standing || "-" : "-";
  const checkInLabel = player.checkedInAt ? "済" : player.didNotCheckIn ? "不参加" : "未";

  els.mySummary.innerHTML = `
    <article><span>選手</span><strong>${escapeHtml(player.displayName)}</strong></article>
    <article><span>総合順位</span><strong>${standingText}</strong></article>
    <article><span>獲得pt</span><strong>${points}</strong></article>
    <article><span>消化</span><strong>${played}/6</strong></article>
    <article><span>チェックイン</span><strong>${player.checkedInAt ? "済" : "未"}</strong></article>
  `;
  renderNextAction(player);
  const canCancelEntry = state.tournament?.status === "entry" && !player.checkedInAt;
  const cancelHelp = player.checkedInAt
    ? "チェックイン後は大会進行に影響するためキャンセルできません。"
    : canCancelEntry
      ? "受付中はキャンセルできます。"
      : "大会開始後はエントリーをキャンセルできません。";
  els.myEntryActions.innerHTML = `
    <div class="entry-cancel-card ${canCancelEntry ? "" : "is-locked"}">
      <div>
        <span>参加中の大会</span>
        <strong>${escapeHtml(state.tournament?.name || "大会未設定")}</strong>
        <small>${escapeHtml(cancelHelp)}</small>
      </div>
      ${canCancelEntry ? `<button class="danger-button cancel-entry-button" type="button">この大会のエントリーをキャンセル</button>` : ""}
    </div>
  `;
  renderMyProfile(player);
  renderMyLobbies(playerId);
  renderMyHistory(history);
  renderPastResults(player);
  renderMyPageTabs(player, player);
  maybeShowHostDialog(playerId);
}

function renderMyPageTabs(profile, player) {
  if (!["tournament", "account"].includes(currentMyPageTab)) currentMyPageTab = "tournament";
  const tournamentAlerts = getTournamentAlerts(player);
  const accountAlerts = getAccountAlerts(profile);
  els.myTournamentPanel?.classList.toggle("hidden", currentMyPageTab !== "tournament");
  els.myAccountPanel?.classList.toggle("hidden", currentMyPageTab !== "account");
  els.myPageTabs?.querySelectorAll("[data-my-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.myTab === currentMyPageTab);
  });
  updateTabAlert(els.myTournamentBadge, tournamentAlerts);
  updateTabAlert(els.myAccountBadge, accountAlerts);
  renderMyPageTabNotes(tournamentAlerts, accountAlerts);
}

function updateTabAlert(element, alerts) {
  if (!element) return;
  const label = alertBadgeLabel(alerts);
  element.classList.toggle("hidden", !label);
  element.textContent = label;
}

function alertBadgeLabel(alerts) {
  if (!alerts?.length) return "";
  return alerts.length === 1 ? alerts[0].badge : "要確認";
}

function renderMyPageTabNotes(tournamentAlerts, accountAlerts) {
  if (!els.myPageTabNotes) return;
  const alerts = currentMyPageTab === "account" ? accountAlerts : tournamentAlerts;
  els.myPageTabNotes.classList.toggle("hidden", !alerts.length);
  els.myPageTabNotes.innerHTML = alerts.length
    ? alerts.map((alert) => `<span>${escapeHtml(alert.text)}</span>`).join("")
    : "";
}

function getTournamentAlerts(player) {
  if (!currentProfile) return [];
  if (!hasTournament()) return [];
  const checkInState = checkInWindowState();
  if (!player) return [{ badge: "未エントリー", text: "大会に参加するには、大会カードからエントリーしてください。" }];
  if (!player.checkedInAt && checkInState.state === "open") return [{ badge: "チェックイン", text: "チェックイン受付中です。大会情報タブからチェックインしてください。" }];
  if (getCurrentReportTarget()) return [{ badge: "結果報告", text: "あなたが報告できる試合結果があります。結果報告へ進んでください。" }];
  if (player.didNotCheckIn && ["ready", "live", "finished"].includes(state.tournament?.status)) return [{ badge: "不参加扱い", text: "チェックイン未完了のため、この大会は自動キャンセル扱いです。" }];
  return [];
}

function getAccountAlerts(profile) {
  if (!profile) return [];
  const alerts = [];
  if (!getCurrentAccountEmail()) alerts.push({ badge: "メール未連携", text: "メールアドレスが未連携です。ログイン保守のため、アカウント設定から登録できます。" });
  if (!isValidRiotId(profile.riotId || "")) alerts.push({ badge: "Riot ID確認", text: "Riot IDはサモナーネーム#タグの形式で入力してください。" });
  if (!profile.discordId) alerts.push({ badge: "Discord確認", text: "Discord IDが未入力です。大会運営の連絡先として必要です。" });
  return alerts;
}

function renderMyProfile(profile) {
  const avatar = getDisplayAvatar(profile);
  const accountEmail = getCurrentAccountEmail();
  const earnedTitles = Array.isArray(profile.earnedTitles) ? profile.earnedTitles : [];
  const selectedTitle = earnedTitles.includes(profile.selectedTitle) ? profile.selectedTitle : "";
  const selectedTitleName = REWARD_TITLES.find((title) => title.id === selectedTitle)?.name || "";
  const riotNameValue = summonerName(profile.riotId || "");
  const riotTagValue = riotTag(profile.riotId || "");
  const earnedTitleOptions = REWARD_TITLES
    .filter((title) => earnedTitles.includes(title.id))
    .map((title) => `<option value="${title.id}" ${selectedTitle === title.id ? "selected" : ""}>${escapeHtml(title.name)}</option>`)
    .join("");
  els.myProfileOutput.innerHTML = `
    <h3>アカウント情報</h3>
    <div class="profile-hero">
      <div class="profile-avatar-wrap ${profile.avatarFrame ? `frame-${escapeHtml(profile.avatarFrame)}` : ""}">
        <img class="profile-avatar" src="${escapeHtml(avatar)}" alt="" />
      </div>
      <div>
        <span>PLAYER ICON</span>
        <strong>${escapeHtml(profile.displayName || "-")}</strong>
        <em>${escapeHtml(selectedTitleName || "称号未設定")}</em>
        <p>${escapeHtml(profile.riotId || "Riot ID未設定")}</p>
      </div>
    </div>
    <div class="profile-grid">
      <article><span>表示名</span><strong>${escapeHtml(profile.displayName || "-")}</strong></article>
      <article><span>Riot ID</span><strong>${escapeHtml(profile.riotId || "-")}</strong></article>
      <article><span>Discord</span><strong>${escapeHtml(profile.discordId || "-")}</strong></article>
      <article><span>X</span><strong>${escapeHtml(profile.xAccount || "-")}</strong></article>
      <article><span>称号</span><strong>${escapeHtml(selectedTitleName || "未設定")}</strong></article>
      <article><span>メールアドレス連携</span><strong>${escapeHtml(accountEmail || "未連携")}</strong></article>
    </div>
    <details class="profile-edit">
      <summary>アカウント情報を編集</summary>
      <form id="profileEditForm" class="profile-edit-form">
        <label>表示名<input name="displayName" required maxlength="32" value="${escapeHtml(profile.displayName || "")}" /></label>
        <div class="form-field riot-id-field">
          <span>Riot ID</span>
          <div class="riot-id-split">
            <input name="riotName" required maxlength="32" placeholder="サモナーネーム" value="${escapeHtml(riotNameValue)}" />
            <b>#</b>
            <input name="riotTag" required maxlength="12" placeholder="JP1" value="${escapeHtml(riotTagValue)}" />
          </div>
        </div>
        <label>Discord ID<input name="discordId" required maxlength="48" value="${escapeHtml(profile.discordId || "")}" /></label>
        <label>X（任意）<input name="xAccount" maxlength="32" value="${escapeHtml(profile.xAccount || "")}" /></label>
        <button class="primary-button" type="submit">保存する</button>
      </form>
    </details>
    <details class="profile-edit reward-cosmetics">
      <summary>称号・報酬装飾</summary>
      <form id="rewardCosmeticsForm" class="profile-edit-form">
        <label>称号
          <select name="selectedTitle" ${earnedTitles.length ? "" : "disabled"}>
            <option value="">称号なし</option>
            ${earnedTitleOptions}
          </select>
        </label>
        <p class="security-note">称号、特別アイコン、フレームは大会報酬で解放されます。未獲得の装飾は選択できません。</p>
        <div class="reward-grid">
          <article class="reward-card active"><span>標準</span><strong>黒アイコン</strong><small>全プレイヤー共通</small></article>
          ${REWARD_TITLES.map((title) => `<article class="reward-card ${earnedTitles.includes(title.id) ? "unlocked" : "locked"}"><span>称号</span><strong>${escapeHtml(title.name)}</strong><small>${escapeHtml(title.note)}</small></article>`).join("")}
          ${REWARD_FRAMES.map((frame) => `<article class="reward-card locked"><span>フレーム</span><strong>${escapeHtml(frame.name)}</strong><small>${escapeHtml(frame.note)}</small></article>`).join("")}
        </div>
        <button class="primary-button" type="submit" ${earnedTitles.length ? "" : "disabled"}>装飾を保存</button>
      </form>
    </details>
    <details class="profile-edit account-security">
      <summary>メールアドレス連携・パスワード再設定</summary>
      <form id="accountSecurityForm" class="profile-edit-form">
        <label>メールアドレス連携<input name="accountEmail" type="email" maxlength="80" placeholder="mail@example.com" value="${escapeHtml(accountEmail)}" /></label>
        <label>新しいパスワード<input name="newPassword" type="password" minlength="6" maxlength="80" placeholder="変更する場合のみ入力" /></label>
        <label>新しいパスワード確認<input name="confirmPassword" type="password" minlength="6" maxlength="80" placeholder="もう一度入力" /></label>
        <p class="security-note">メールアドレスを連携すると、次回からメールアドレスでもログインできます。実運用ではメール認証と再設定メール送信をサーバー側で実装します。</p>
        <button class="primary-button" type="submit">アカウント保守情報を保存</button>
      </form>
    </details>
  `;
}

function renderNextAction(player) {
  if (!currentProfile) {
    els.myNextAction.innerHTML = "";
    return;
  }
  if (!hasTournament()) {
    els.myNextAction.innerHTML = nextActionMarkup("大会待ち", "開催予定の大会はまだありません。運営が大会を作成するとホームに表示されます。", "home", "大会を見る");
    return;
  }
  if (!player) {
    els.myNextAction.innerHTML = nextActionMarkup("次にやること", "参加したい大会カードからエントリーしてください。", "home", "大会へ");
    return;
  }
  const status = state.tournament.status;
  const checkInState = checkInWindowState();
  if (player.didNotCheckIn && ["ready", "live", "finished"].includes(status)) {
    els.myNextAction.innerHTML = nextActionMarkup("チェックイン未完了", "締切までにチェックインできなかったため、この大会は自動キャンセル扱いです。次の大会で再エントリーしてください。", "home", "大会へ戻る");
    return;
  }
  if (!player.checkedInAt && checkInState.state === "open") {
    els.myNextAction.innerHTML = nextActionMarkup("チェックイン受付中", "大会開始前の30分間です。参加するなら今チェックインしてください。", "", "チェックイン", "check-in-now");
    return;
  }
  const reportTarget = getCurrentReportTarget();
  if (status === "live" && reportTarget) {
    els.myNextAction.innerHTML = nextActionMarkup("結果報告できます", `あなたの報告対象は Game ${reportTarget.game} / Lobby ${reportTarget.lobbyIndex + 1} です。`, "report", "結果報告へ");
    return;
  }
  const lobbyEntry = findCurrentLobbyEntry(player.id);
  if (status === "live" && lobbyEntry) {
    els.myNextAction.innerHTML = nextActionMarkup("自分のロビーを確認", `Game ${lobbyEntry.block.games.join("・")} / Lobby ${lobbyEntry.lobbyIndex + 1} に参加中です。`, "", "下のロビーを見る");
    return;
  }
  if (status === "entry") {
    els.myNextAction.innerHTML = nextActionMarkup("エントリー済み", checkInState.message, "home", "大会情報を見る");
    return;
  }
  if (status === "ready") {
    els.myNextAction.innerHTML = nextActionMarkup("大会開始待ち", "チェックイン受付は終了しました。運営が最終確認して大会を開始します。", "home", "大会情報を見る");
    return;
  }
  els.myNextAction.innerHTML = nextActionMarkup("進行待ち", "運営のロビー生成または次の案内を待ってください。", "home", "大会情報を見る");
}

function nextActionMarkup(title, text, target, action, extraClass = "") {
  const tournamentLine = hasTournament()
    ? `<span class="next-action-tournament">${escapeHtml(state.tournament?.name || "大会未設定")} / ${escapeHtml(statusLabel(state.tournament?.status || "entry"))} / ${escapeHtml(formatStartAt(state.tournament?.startAt))}</span>`
    : "";
  const button = target
    ? `<button class="primary-button next-action-button" type="button" data-go="${target}">${action}</button>`
    : `<button class="secondary-button next-action-button ${extraClass}" type="button">${action}</button>`;
  return `
    <div>
      <span>この大会で次にやること</span>
      ${tournamentLine}
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
    ${button}
  `;
}

function renderPastResults(profile) {
  const riotKey = normalize(profile.riotId || "");
  const rows = state.tournaments
    .map((tour) => {
      const player = tour.players.find((item) => normalize(item.riotId || "") === riotKey && riotKey);
      if (!player) return null;
      const standings = calculateTournamentStandings(tour);
      const standingIndex = standings.findIndex((row) => row.player.id === player.id);
      const row = standings[standingIndex];
      const history = row?.history || [1, 2, 3, 4, 5, 6].map((gameNo) => Number(tour.results[gameNo]?.[player.id] || 0));
      const played = history.filter(Boolean).length;
      if (player.didNotCheckIn && !played) return null;
      const points = row?.points || history.reduce((sum, placement) => sum + scoreForPlacement(placement), 0);
      return {
        tour,
        player,
        points,
        played,
        history,
        rank: standingIndex >= 0 ? standingIndex + 1 : 0,
        total: tour.players.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.tour.tournament.startAt || 0) - new Date(a.tour.tournament.startAt || 0));

  els.myPastResultsOutput.innerHTML = `<h3>大会成績</h3>`;
  if (!rows.length) {
    els.myPastResultsOutput.insertAdjacentHTML("beforeend", `<div class="empty-state">まだ大会成績はありません。自動キャンセルになった大会は成績に表示されません。</div>`);
    return;
  }
  rows.forEach((row) => {
    const status = row.tour.tournament.status || "upcoming";
    const showRank = ["live", "finished"].includes(status) && row.played > 0;
    const rankLabel = status === "finished" ? "最終順位" : status === "live" ? "現在順位" : "状況";
    const rankValue = showRank && row.rank ? `${row.rank} / ${row.total}` : "試合前";
    const card = document.createElement("article");
    card.className = `past-result-card is-${status}`;
    card.innerHTML = `
      <div class="past-result-head">
        <div>
          <strong>${escapeHtml(row.tour.tournament.name)}</strong>
          <span>${escapeHtml(statusLabel(status))} / ${escapeHtml(formatStartAt(row.tour.tournament.startAt))}</span>
        </div>
        <b>${rankLabel}<em>${rankValue}</em></b>
      </div>
      <div class="past-result-stats">
        <span>${row.points}pt</span>
        <span>${row.played}/6戦</span>
      </div>
      <div class="history">${row.history.map((placement) => `<span>${placement || "-"}</span>`).join("")}</div>
    `;
    els.myPastResultsOutput.append(card);
  });
}

function loginOrCreateUser(profile) {
  const normalizedRiot = normalize(profile.riotId);
  const player = state.players.find((item) => normalize(item.riotId) === normalizedRiot && normalizedRiot);
  currentProfile = profile;
  persistCurrentProfile();
  currentUserId = player?.id || "";
  if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId);
  else localStorage.removeItem(SESSION_KEY);
  render();
}

function persistCurrentProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));
  getCurrentAccountEntries().forEach(([key]) => {
    accounts[key].profile = currentProfile;
  });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getCurrentAccountEntries() {
  if (!currentProfile) return [];
  const currentKeys = [
    normalize(currentProfile.displayName),
    normalize(currentProfile.riotId),
    normalize(currentProfile.discordId),
    normalize(currentProfile.accountEmail),
  ].filter(Boolean);
  return Object.entries(accounts).filter(([key, account]) => {
    const profile = account.profile || {};
    return account.profile === currentProfile || [
      key,
      normalize(profile.displayName),
      normalize(profile.riotId),
      normalize(profile.discordId),
      normalize(profile.accountEmail),
    ].some((item) => currentKeys.includes(item));
  });
}

function getCurrentAccountEmail() {
  return currentProfile?.accountEmail || getCurrentAccountEntries().find(([key]) => key.includes("@"))?.[0] || "";
}

function getDisplayAvatar(profile) {
  return profile?.specialAvatarUrl || DEFAULT_AVATAR_URL;
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const payload = new TextEncoder().encode(`${salt}:${password}`);
  if (!globalThis.crypto?.subtle?.digest) return fallbackHashPassword(password, salt);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fallbackHashPassword(password, salt) {
  const input = `${salt}:${password}`;
  let hashA = 0x811c9dc5;
  let hashB = 0x45d9f3b;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x85ebca6b) >>> 0;
  }
  return `${hashA.toString(16).padStart(8, "0")}${hashB.toString(16).padStart(8, "0")}`;
}

async function createPasswordRecord(password) {
  const salt = randomSalt();
  return {
    version: globalThis.crypto?.subtle?.digest ? "sha256-salt-v1" : "local-http-fallback-v1",
    salt,
    hash: await hashPassword(password, salt),
  };
}

async function verifyAccountPassword(account, password) {
  if (!account) return { ok: false };
  if (account.passwordHash?.salt && account.passwordHash?.hash) {
    const hash = await hashPassword(password, account.passwordHash.salt);
    return { ok: hash === account.passwordHash.hash };
  }
  if (account.password && account.password === password) {
    return { ok: true, migratedPasswordHash: await createPasswordRecord(password) };
  }
  return { ok: false };
}

function updateCurrentProfile(profileInput) {
  if (!currentProfile) return;
  if (!profileInput.displayName || !profileInput.riotId || !profileInput.discordId) {
    notify("入力不足", "表示名、Riot ID、Discord IDは必須です。", "warn");
    return;
  }
  if (!isValidRiotId(profileInput.riotId)) {
    notify("Riot IDを確認", "サモナーネーム#タグ の形式で入力してください。例: SummonerName#JP1", "warn");
    return;
  }

  const previousProfile = currentProfile;
  const previousKeys = new Set([
    normalize(previousProfile.displayName),
    normalize(previousProfile.riotId),
    normalize(previousProfile.discordId),
  ].filter(Boolean));
  currentProfile = {
    displayName: profileInput.displayName,
    riotId: profileInput.riotId,
    discordId: profileInput.discordId,
    xAccount: profileInput.xAccount,
    accountEmail: previousProfile.accountEmail || getCurrentAccountEmail(),
    avatarUrl: DEFAULT_AVATAR_URL,
    specialAvatarUrl: previousProfile.specialAvatarUrl || "",
    selectedTitle: previousProfile.selectedTitle || "",
    earnedTitles: Array.isArray(previousProfile.earnedTitles) ? previousProfile.earnedTitles : [],
    avatarFrame: previousProfile.avatarFrame || "",
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));

  Object.entries(accounts).forEach(([key, account]) => {
    const accountKeys = [
      key,
      normalize(account.profile?.displayName),
      normalize(account.profile?.riotId),
      normalize(account.profile?.discordId),
    ];
    if (account.profile === previousProfile || accountKeys.some((item) => previousKeys.has(item))) {
      accounts[key].profile = currentProfile;
    }
  });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

  const player = getPlayer(currentUserId);
  if (player) {
    player.displayName = currentProfile.displayName;
    player.riotId = currentProfile.riotId;
    player.discordId = currentProfile.discordId;
    player.xAccount = currentProfile.xAccount;
    player.avatarUrl = currentProfile.avatarUrl;
    player.specialAvatarUrl = currentProfile.specialAvatarUrl;
    player.selectedTitle = currentProfile.selectedTitle;
    player.earnedTitles = currentProfile.earnedTitles;
    player.avatarFrame = currentProfile.avatarFrame;
  }
  render();
}

function updateRewardCosmetics(formInput) {
  if (!currentProfile) return;
  const earnedTitles = Array.isArray(currentProfile.earnedTitles) ? currentProfile.earnedTitles : [];
  const selectedTitle = String(formInput.selectedTitle || "");
  if (selectedTitle && !earnedTitles.includes(selectedTitle)) {
    notify("称号未獲得", "未獲得の称号は設定できません。", "warn");
    return;
  }
  currentProfile = {
    ...currentProfile,
    selectedTitle,
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));
  getCurrentAccountEntries().forEach(([key]) => {
    accounts[key].profile = currentProfile;
  });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  const player = getPlayer(currentUserId);
  if (player) player.selectedTitle = selectedTitle;
  render();
}

async function updateAccountSecurity(formInput) {
  if (!currentProfile) return;
  const accountEmail = String(formInput.accountEmail || "").trim();
  const newPassword = String(formInput.newPassword || "");
  const confirmPassword = String(formInput.confirmPassword || "");
  if (accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
    notify("メールアドレスを確認", "有効なメールアドレスを入力してください。", "warn");
    return;
  }
  if (newPassword || confirmPassword) {
    if (newPassword.length < 6) {
      notify("パスワードを確認", "新しいパスワードは6文字以上で入力してください。", "warn");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("パスワード不一致", "確認用パスワードが一致していません。", "warn");
      return;
    }
  }

  const entries = getCurrentAccountEntries();
  const passwordHash = newPassword ? await createPasswordRecord(newPassword) : null;
  const primaryAccount = entries[0]?.[1] || { profile: currentProfile };
  const emailKey = normalize(accountEmail);
  if (emailKey) {
    const duplicate = accounts[emailKey];
    const duplicateMatchesCurrent = entries.some(([key]) => key === emailKey);
    if (duplicate && !duplicateMatchesCurrent) {
      notify("メールアドレス使用中", "このメールアドレスは別のアカウントで使用されています。", "warn");
      return;
    }
  }

  currentProfile = {
    ...currentProfile,
    accountEmail,
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));

  const keysToUpdate = new Set(entries.map(([key]) => key));
  if (!keysToUpdate.size) keysToUpdate.add(normalize(currentProfile.displayName || currentProfile.riotId || accountEmail));
  if (emailKey) keysToUpdate.add(emailKey);

  keysToUpdate.forEach((key) => {
    if (!key) return;
    const account = accounts[key] || primaryAccount;
    accounts[key] = {
      ...account,
      passwordHash: passwordHash || account.passwordHash || primaryAccount.passwordHash,
      profile: currentProfile,
    };
    if (passwordHash) delete accounts[key].password;
  });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  render();
  notify("保存しました", "アカウント保守情報を保存しました。", "success");
}

function removePlayerFromTournament(playerId) {
  state.players = state.players.filter((player) => player.id !== playerId);
  state.lobbies = state.lobbies.map((block) => block.map((lobby) => lobby.filter((id) => id !== playerId)));
  state.lobbyHosts = state.lobbyHosts.map((block, blockIndex) => block.map((hostId, lobbyIndex) => {
    if (hostId !== playerId) return hostId;
    return state.lobbies[blockIndex]?.[lobbyIndex]?.[0] || "";
  }));
  Object.keys(state.results).forEach((gameNo) => delete state.results[gameNo][playerId]);
  state.reports = state.reports.map((report) => ({
    ...report,
    matches: report.matches.filter((match) => match.playerId !== playerId),
    winnerId: report.winnerId === playerId ? "" : report.winnerId,
  }));
}

function cancelCurrentEntry() {
  const player = getPlayer(currentUserId);
  if (!player) return;
  if (player.checkedInAt) {
    notify("キャンセル不可", "チェックイン後は大会進行に影響するため、エントリーをキャンセルできません。", "warn");
    return;
  }
  if (state.tournament?.status !== "entry") {
    notify("キャンセル不可", "エントリー受付終了後はキャンセルできません。", "warn");
    return;
  }
  if (!confirm("この大会のエントリーをキャンセルしますか？")) return;
  removePlayerFromTournament(player.id);
  currentUserId = "";
  localStorage.removeItem(SESSION_KEY);
  render();
  go("mypage");
}

async function authLoginOrRegister(loginId, password, profileInput) {
  const key = normalize(loginId);
  if (!key || !password) return false;
  const existing = accounts[key];
  if (authMode === "login" && !existing) {
    authMode = "register";
    renderAuthMode();
    els.authLoginId.value = loginId;
    els.authPassword.value = password;
    notify("新規登録へ切替", "表示名、Riot ID、Discord IDを入力して登録してください。", "warn");
    return false;
  }
  if (existing) {
    const verification = await verifyAccountPassword(existing, password);
    if (!verification.ok) {
      notify("ログイン失敗", "パスワードが違います。", "error");
      return false;
    }
    if (verification.migratedPasswordHash) {
      existing.passwordHash = verification.migratedPasswordHash;
      delete existing.password;
      accounts[key] = existing;
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  }
  if (authMode === "register" && existing) {
    notify("登録済み", "このユーザー名またはメールアドレスは登録済みです。ログインを選んでください。", "warn");
    return false;
  }
  if (authMode === "register" && (!profileInput.displayName || !profileInput.riotId || !profileInput.discordId)) {
    notify("入力不足", "新規登録には表示名、Riot ID、Discord IDが必要です。", "warn");
    return false;
  }
  if (authMode === "register" && !isValidRiotId(profileInput.riotId)) {
    notify("Riot IDを確認", "サモナーネーム#タグ の形式で入力してください。例: SummonerName#JP1", "warn");
    return false;
  }
  const profile = existing?.profile || {
    ...profileInput,
    accountEmail: key.includes("@") ? loginId : "",
  };
  if (key.includes("@") && !profile.accountEmail) profile.accountEmail = loginId;
  accounts[key] = existing
    ? { ...existing, profile }
    : { passwordHash: await createPasswordRecord(password), profile };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  currentProfile = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));
  const player = state.players.find((item) => normalize(item.riotId) === normalize(profile.riotId) && profile.riotId);
  currentUserId = player?.id || "";
  if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId);
  else localStorage.removeItem(SESSION_KEY);
  render();
  go("home");
  return true;
}

function quickEnterCurrentProfile() {
  if (!currentProfile) return;
  if (!hasTournament()) {
    notify("大会開催待ち", "現在エントリーできる大会はありません。", "warn");
    return;
  }
  const normalizedRiot = normalize(currentProfile.riotId);
  let player = state.players.find((item) => normalize(item.riotId) === normalizedRiot && normalizedRiot);
  if (!player) {
    const maxPlayers = Number(state.tournament?.maxPlayers || 256);
    const mainPlayerCount = state.players.filter((item) => !item.isSubstitute).length;
    player = {
      id: uid(),
      displayName: currentProfile.displayName,
      riotId: currentProfile.riotId,
      discordId: currentProfile.discordId,
      xAccount: currentProfile.xAccount,
      avatarUrl: DEFAULT_AVATAR_URL,
      specialAvatarUrl: currentProfile.specialAvatarUrl || "",
      selectedTitle: currentProfile.selectedTitle || "",
      earnedTitles: Array.isArray(currentProfile.earnedTitles) ? currentProfile.earnedTitles : [],
      avatarFrame: currentProfile.avatarFrame || "",
      isSubstitute: mainPlayerCount >= maxPlayers,
    };
    state.players.push(player);
  }
  currentUserId = player.id;
  localStorage.setItem(SESSION_KEY, currentUserId);
  render();
}

function completeEntryOnHome() {
  quickEnterCurrentProfile();
  go("home");
  showEntryCompleteCue();
}

function showEntryCompleteCue() {
  showToast("エントリー完了", "右上のマイページから、チェックインや自分のテーブルを確認できます。", "success");
  els.myPageTopBtn.classList.add("attention");
}

function notify(title, text, type = "warn") {
  showToast(title, text, type);
}

function showToast(title, text, type = "success") {
  els.entryCompleteToast.querySelector("strong").textContent = title;
  els.entryCompleteToast.querySelector("span").textContent = text;
  els.entryCompleteToast.dataset.type = type;
  els.entryCompleteToast.classList.remove("hidden");
  els.entryCompleteToast.classList.add("show");
  clearTimeout(showEntryCompleteCue.timer);
  showEntryCompleteCue.timer = setTimeout(() => {
    els.entryCompleteToast.classList.remove("show");
    els.myPageTopBtn.classList.remove("attention");
    setTimeout(() => els.entryCompleteToast.classList.add("hidden"), 220);
  }, 3600);
}

function requestEntryWithNotice() {
  if (!currentProfile) {
    go("opening");
    return;
  }
  if (getPlayer(currentUserId)) {
    go("mypage");
    return;
  }
  renderEntryNoticeTimeline();
  els.entryTimelineConfirm.checked = false;
  if (els.entryRuleConfirm) els.entryRuleConfirm.checked = false;
  els.entryNoticeAgreeBtn.disabled = true;
  els.entryNoticeDialog.showModal();
}

function acceptEntryNotice() {
  if (!els.entryTimelineConfirm.checked) {
    notify("確認が必要です", "大会タイムラインを確認してからエントリーしてください。", "warn");
    return;
  }
  if (els.entryRuleConfirm && !els.entryRuleConfirm.checked) {
    notify("同意が必要です", "大会参加ルールと禁止事項に同意してからエントリーしてください。", "warn");
    return;
  }
  els.entryNoticeDialog.close();
  completeEntryOnHome();
}

function updateEntryNoticeAgreeState() {
  if (!els.entryNoticeAgreeBtn || !els.entryTimelineConfirm) return;
  const ruleOk = els.entryRuleConfirm ? els.entryRuleConfirm.checked : true;
  els.entryNoticeAgreeBtn.disabled = !(els.entryTimelineConfirm.checked && ruleOk);
}

function checkInWindowState() {
  if (!hasTournament()) return { state: "unset", message: "現在開催予定の大会はありません。" };
  if (!state.tournament.startAt) return { state: "unset", message: "開始日時が未設定のため、チェックインはまだ使えません。" };
  const start = new Date(state.tournament.startAt).getTime();
  const now = Date.now();
  const open = start - 30 * 60 * 1000;
  const close = start;
  if (now < open) return { state: "early", message: `チェックインは大会当日の開始30分前から開始時刻までです。受付開始: ${formatStartAt(new Date(open).toISOString())}` };
  if (now > close) return { state: "closed", message: "チェックイン時間は終了しました。" };
  if (state.tournament.status !== "checkin") return { state: "closed", message: "チェックイン受付中ではありません。" };
  return { state: "open", message: "チェックイン受付中です。" };
}

function performCheckIn() {
  const user = getPlayer(currentUserId);
  if (!user) return;
  const windowState = checkInWindowState();
  if (windowState.state !== "open") {
    notify("チェックイン不可", windowState.message, "warn");
    return;
  }
  user.checkedInAt = new Date().toISOString();
  user.didNotCheckIn = false;
  if (els.checkInDialog.open) els.checkInDialog.close();
  render();
}

function maybeShowCheckInDialog() {
  const user = getPlayer(currentUserId);
  if (!user || user.checkedInAt || els.checkInDialog.open) return;
  if (checkInWindowState().state !== "open") return;
  const key = `tftrise-checkin-popup-${state.activeTournamentId}-${user.id}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  setTimeout(() => els.checkInDialog.showModal(), 150);
}

function renderMyLobbies(playerId) {
  const entries = [];
  getLobbyBlocks().forEach((block, blockIndex) => {
    (state.lobbies[blockIndex] || []).forEach((lobby, lobbyIndex) => {
      if (!lobby.includes(playerId)) return;
      entries.push({ block, lobby, lobbyIndex });
    });
  });

  if (!entries.length) {
    els.myLobbyOutput.innerHTML = `
      <h3>自分のテーブル</h3>
      <div class="my-lobby-tournament">
        <span>大会</span>
        <strong>${escapeHtml(state.tournament?.name || "大会未設定")}</strong>
        <small>${escapeHtml(statusLabel(state.tournament?.status || "entry"))} / ${escapeHtml(formatStartAt(state.tournament?.startAt))}</small>
      </div>
      <div class="empty-state">まだロビーが生成されていません。大会開始後、ここに自分のテーブルが表示されます。</div>
    `;
    return;
  }

  els.myLobbyOutput.innerHTML = `
    <h3>自分のテーブル</h3>
    <div class="my-lobby-tournament">
      <span>大会</span>
      <strong>${escapeHtml(state.tournament?.name || "大会未設定")}</strong>
      <small>${escapeHtml(statusLabel(state.tournament?.status || "entry"))} / ${escapeHtml(formatStartAt(state.tournament?.startAt))}</small>
    </div>
  `;
  entries.forEach((entry) => {
    const card = document.createElement("section");
    card.className = "my-lobby-card";
    const hostId = state.lobbyHosts?.[getBlockIndex(entry.block.games[0])]?.[entry.lobbyIndex];
    const isHost = hostId === playerId;
    if (isHost) card.classList.add("is-host");
    card.innerHTML = `
      <div class="my-lobby-head">
        <span>対象試合 Game ${entry.block.games.join("・")}</span>
        <strong>あなたは Lobby ${entry.lobbyIndex + 1}</strong>
      </div>
      <div class="host-line ${isHost ? "is-me" : ""}">
        ${isHost ? "あなたがテーブルの開設者です。テーブル作成をお願いします。" : `テーブル開設者: ${escapeHtml(getPlayer(hostId)?.displayName || "未割り当て")}`}
        <button class="secondary-button lobby-guide-button" type="button">テーブルの作り方</button>
      </div>
    `;
    const ol = document.createElement("ol");
    entry.lobby.forEach((id) => {
      const player = getPlayer(id);
      const li = document.createElement("li");
      li.className = id === playerId ? "is-me" : "";
      li.innerHTML = player
        ? (id === playerId ? playerRiotDisplayMarkup(player) : playerRiotCopyMarkup(player))
        : `<span>削除済み</span>`;
      ol.append(li);
    });
    card.append(ol);
    els.myLobbyOutput.append(card);
  });
}

function findCurrentLobbyEntry(playerId) {
  for (const [blockIndex, block] of getLobbyBlocks().entries()) {
    const lobbies = state.lobbies[blockIndex] || [];
    const lobbyIndex = lobbies.findIndex((lobby) => lobby.includes(playerId));
    if (lobbyIndex >= 0) return { block, lobby: lobbies[lobbyIndex], lobbyIndex };
  }
  return null;
}

function maybeShowHostDialog(playerId) {
  const assignments = [];
  getLobbyBlocks().forEach((block, blockIndex) => {
    (state.lobbyHosts?.[blockIndex] || []).forEach((hostId, lobbyIndex) => {
      if (hostId === playerId) assignments.push({ block, lobbyIndex });
    });
  });
  if (!assignments.length || els.hostDialog.open) return;
  const key = `tftrise-host-popup-${playerId}-${assignments.map((item) => `${item.block.games.join("-")}-${item.lobbyIndex}`).join("_")}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const first = assignments[0];
  els.hostDialogText.textContent = `対象試合 Game ${first.block.games.join("・")} / Lobby ${first.lobbyIndex + 1} のテーブル作成をお願いします。`;
  setTimeout(() => els.hostDialog.showModal(), 100);
}

function renderMyHistory(history) {
  els.myHistoryOutput.innerHTML = `
    <h3>成績</h3>
    <div class="history">${history.map((placement) => `<span>${placement || "-"}</span>`).join("")}</div>
  `;
}

function renderManualFallback() {
  const lobby = getSelectedLobby();
  els.manualFallbackRows.innerHTML = "";
  if (!lobby.length) {
    els.manualFallbackRows.innerHTML = `<div class="empty-state">管理者がロビーを生成すると入力できます。</div>`;
    return;
  }

  lobby.forEach((playerId) => {
    const player = getPlayer(playerId);
    if (!player) return;
    const row = document.createElement("label");
    row.className = "manual-row";
    row.innerHTML = `
      <span class="player-meta"><strong>${escapeHtml(player.displayName)}</strong><span>${escapeHtml(player.riotId || "-")}</span></span>
    `;
    const select = document.createElement("select");
    select.dataset.player = player.id;
    select.innerHTML = els.placementTemplate.innerHTML;
    row.append(select);
    els.manualFallbackRows.append(row);
  });
}

function renderAdmin() {
  renderAdminAccess();
  renderAdminOpsChecklist();
  renderTournamentList();
  renderTournamentForm();
  renderPlayersTable();
  renderLobbyGenerateButtons();
  renderLobbies();
  renderAdminResults();
  renderStandings();
}

function renderAdminOpsChecklist() {
  if (!els.adminOpsChecklist) return;
  if (els.startReadinessOutput) els.startReadinessOutput.innerHTML = "";
  if (!hasTournament()) {
    renderAdminNextAction({
      eyebrow: "SETUP",
      title: "まず大会を作成",
      text: "大会がまだありません。大会名、開始日時、形式を決めて開催準備を始めましょう。",
      action: "新しい大会を作成",
      actionKey: "create-tournament",
      tone: "warn",
    });
    els.adminOpsChecklist.innerHTML = `
      <article class="admin-ops-item current">
        <span>1</span>
        <div><strong>新しい大会を作成</strong><p>大会名、開始日時、形式、定員を設定して保存してください。</p></div>
      </article>
    `;
    return;
  }

  const status = state.tournament.status || "entry";
  const checkedIn = checkedInPlayerList().length;
  const activePlayers = getLobbyPlayerPool().length;
  const blocks = getLobbyBlocks();
  const currentBlockIndex = Math.max(0, blocks.findIndex((_, index) => !isBlockComplete(index)));
  const currentBlock = blocks[currentBlockIndex] || blocks[0];
  const hasCurrentLobby = Boolean(state.lobbies?.[currentBlockIndex]?.length);
  const entriesClosed = ["checkin", "ready", "live", "finished"].includes(status);
  renderAdminNextAction(getAdminNextAction({
    status,
    checkedIn,
    activePlayers,
    currentBlock,
    currentBlockIndex,
    hasCurrentLobby,
  }));

  const items = [
    {
      done: Boolean(state.tournament.startAt),
      title: "大会情報を確定",
      text: `${state.tournament.name || "無題の大会"} / ${formatStartAt(state.tournament.startAt)} / ${formatTypeLabel(state.tournament.formatType)}`,
      current: !state.tournament.startAt,
    },
    {
      done: state.players.length > 0,
      title: "エントリー状況を確認",
      text: `${state.players.length}名エントリー。定員は${state.tournament.maxPlayers || 256}名です。`,
      current: status === "entry",
    },
    {
      done: entriesClosed ? checkedIn > 0 : false,
      title: "チェックインリストを確認",
      text: entriesClosed ? `${checkedIn}名チェックイン / 正式参加 ${activePlayers}名` : "開始30分前になるとチェックイン受付に自動で切り替わります。",
      current: status === "checkin" || status === "ready",
    },
    {
      done: status === "live" || status === "finished",
      title: "大会開始",
      text: status === "ready" ? "チェックインリスト確認後に「大会開始」を押してください。" : "開始後は必要なロビーだけ順番に生成されます。",
      current: status === "ready",
    },
    {
      done: status === "finished",
      title: "進行・集計",
      text: status === "live"
        ? `${currentBlock?.games?.join(", ") || "次"}試合目 / ${hasCurrentLobby ? "ロビー生成済み" : "次ロビー生成待ち"}`
        : "結果報告が揃ったら次ロビー生成、全試合完了後に大会終了。",
      current: status === "live",
    },
  ];

  els.adminOpsChecklist.innerHTML = items.map((item, index) => `
    <article class="admin-ops-item ${item.done ? "done" : ""} ${item.current ? "current" : ""}">
      <span>${item.done ? "✓" : index + 1}</span>
      <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>
    </article>
  `).join("");
}

function getAdminNextAction({ status, checkedIn, activePlayers, currentBlock, currentBlockIndex, hasCurrentLobby }) {
  if (!state.tournament.startAt) {
    return {
      eyebrow: "MISSING",
      title: "開始日時を設定",
      text: "ユーザー側のエントリー期間、チェックイン期間、タイムラインが決まりません。先に大会情報を保存してください。",
      action: "大会情報へ",
      actionKey: "focus-tournament-form",
      tone: "warn",
    };
  }
  if (status === "entry") {
    return {
      eyebrow: "ENTRY",
      title: "エントリー受付中",
      text: `${state.players.length}名がエントリー中です。開始30分前になるとチェックイン受付へ自動で切り替わります。`,
      action: "参加者を確認",
      actionKey: "focus-players",
      tone: "info",
    };
  }
  if (status === "checkin") {
    return {
      eyebrow: "CHECK-IN",
      title: "チェックイン受付中",
      text: `${checkedIn}名がチェックイン済みです。受付終了後、正式参加リストを確認してから大会開始へ進みます。`,
      action: "開始前チェック",
      actionKey: "show-start-check",
      tone: checkedIn ? "info" : "warn",
    };
  }
  if (status === "ready") {
    return {
      eyebrow: "READY",
      title: "開始確認待ち",
      text: `${activePlayers}名で開始予定です。必須情報とチェックインリストを確認して、大会を開始してください。`,
      action: "大会開始",
      actionKey: "start-tournament",
      tone: "danger",
    };
  }
  if (status === "live") {
    if (!hasCurrentLobby) {
      return {
        eyebrow: "LOBBY",
        title: "次のロビー生成待ち",
        text: `${currentBlock?.games?.join("・") || "次"}試合目のロビーを生成できます。前ブロック完了前の先行生成は防止されています。`,
        action: "次ロビー生成",
        actionKey: "generate-next-lobby",
        tone: "danger",
      };
    }
    if (currentBlock && !isBlockComplete(currentBlockIndex)) {
      return {
        eyebrow: "REPORT",
        title: "結果報告待ち",
        text: `${currentBlock.games.join("・")}試合目の結果を確認中です。報告が揃ったら次のロビー生成へ進めます。`,
        action: "結果を確認",
        actionKey: "focus-results",
        tone: "info",
      };
    }
    return {
      eyebrow: "FINISH",
      title: "全試合完了",
      text: "全ブロックの結果が揃いました。最終順位を確認して大会を終了できます。",
      action: "大会終了",
      actionKey: "finish-tournament",
      tone: "warn",
    };
  }
  if (status === "finished") {
    return {
      eyebrow: "DONE",
      title: "大会終了済み",
      text: "記録ページに最終順位が反映されています。必要ならバックアップや提出履歴を確認してください。",
      action: "記録を見る",
      actionKey: "go-records",
      tone: "ok",
    };
  }
  return {
    eyebrow: "STATUS",
    title: "大会状況を確認",
    text: "大会の状態に合わせて、次の作業をここに表示します。",
    action: "大会情報へ",
    actionKey: "focus-tournament-form",
    tone: "info",
  };
}

function renderAdminNextAction(action) {
  if (!els.adminNextAction || !action) return;
  els.adminNextAction.innerHTML = `
    <div class="admin-next-copy">
      <span>${escapeHtml(action.eyebrow)}</span>
      <strong>${escapeHtml(action.title)}</strong>
      <p>${escapeHtml(action.text)}</p>
    </div>
    <button class="primary-button admin-next-button" type="button" data-admin-action="${escapeHtml(action.actionKey)}">${escapeHtml(action.action)}</button>
  `;
  els.adminNextAction.dataset.tone = action.tone || "info";
}

function executeAdminNextAction(actionKey) {
  if (actionKey === "create-tournament") {
    createTournament();
    return;
  }
  if (actionKey === "focus-tournament-form") {
    scrollAdminTarget(els.tournamentForm);
    els.tournamentName?.focus();
    return;
  }
  if (actionKey === "focus-players") {
    scrollAdminTarget(els.playersTable);
    return;
  }
  if (actionKey === "show-start-check") {
    renderStartReadiness(validateTournamentStart());
    scrollAdminTarget(els.startReadinessOutput);
    return;
  }
  if (actionKey === "start-tournament") {
    setTournamentStatus("live");
    return;
  }
  if (actionKey === "generate-next-lobby") {
    if (!generateNextLobbyBlock()) {
      notify("生成できません", "前の試合結果が揃っていないか、生成できるロビーがありません。", "warn");
      render();
    }
    return;
  }
  if (actionKey === "focus-results") {
    scrollAdminTarget(els.adminResultsOutput);
    return;
  }
  if (actionKey === "finish-tournament") {
    setTournamentStatus("finished");
    return;
  }
  if (actionKey === "go-records") {
    go("past");
  }
}

function scrollAdminTarget(target) {
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStartReadiness(check = validateTournamentStart()) {
  if (!els.startReadinessOutput) return;
  const hasIssues = check.blockers.length || check.warnings.length;
  if (!hasIssues) {
    els.startReadinessOutput.innerHTML = `
      <div class="start-readiness ok">
        <strong>大会開始チェックOK</strong>
        <p>チェックイン済み ${check.officialCount}名で開始できます。</p>
      </div>
    `;
    return;
  }
  els.startReadinessOutput.innerHTML = `
    <div class="start-readiness ${check.blockers.length ? "error" : "warn"}">
      <strong>${check.blockers.length ? "大会開始前に修正が必要" : "大会開始前の注意"}</strong>
      <p>チェックイン済み ${check.checkedCount}名 / 正式参加予定 ${check.officialCount}名</p>
      ${check.blockers.length ? `<ul>${check.blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${check.warnings.length ? `<ul>${check.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </div>
  `;
}

function renderAdminAccess() {
  const unlocked = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  els.adminLock.classList.toggle("hidden", unlocked);
  els.adminConsole.classList.toggle("hidden", !unlocked);
}

async function unlockAdminConsole(pin = "") {
  const inputPin = String(pin || "").trim();
  if (!inputPin) {
    notify("管理PINが必要", "管理PINを入力してください。", "warn");
    return false;
  }
  if (isLocalPreview() && inputPin === LOCAL_ADMIN_PIN) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    renderAdminAccess();
    notify("管理画面を開きました", "ローカル確認用PINで解除しました。", "success");
    return true;
  }
  try {
    const response = await fetch("/api/admin-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: inputPin }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      notify("管理解除失敗", result.message || "管理PINが違います。", "error");
      return false;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    renderAdminAccess();
    return true;
  } catch (_) {
    notify("管理認証に接続できません", "ローカル確認では Yuuya1228、本番ではVercelのADMIN_PINを使ってください。", "error");
    return false;
  }
}

window.unlockAdminConsole = unlockAdminConsole;

function isLocalPreview() {
  return ["127.0.0.1", "localhost", ""].includes(location.hostname);
}

function renderTournamentList() {
  els.tournamentList.innerHTML = "";
  const hasAnyTournament = state.tournaments.length || hasTournament();
  if (els.deleteTournamentBtn) {
    els.deleteTournamentBtn.disabled = !hasTournament();
    els.deleteTournamentBtn.title = hasTournament() ? "選択中の大会を削除します" : "削除する大会がありません";
  }
  if (els.deleteAllTournamentsBtn) {
    els.deleteAllTournamentsBtn.disabled = !hasAnyTournament;
    els.deleteAllTournamentsBtn.title = hasAnyTournament ? "作成済みの大会をすべて削除します" : "削除する大会がありません";
  }
  if (!state.tournaments.length) {
    els.tournamentList.innerHTML = `<div class="empty-state">まだ大会は作成されていません。「新しい大会を作成」から開催準備を始めてください。</div>`;
    return;
  }
  state.tournaments.forEach((item) => {
    const button = document.createElement("button");
    const isActive = item.id === state.activeTournamentId;
    button.className = `tournament-list-item ${isActive ? "active" : ""}`;
    button.type = "button";
    button.dataset.id = item.id;
    button.title = `${item.tournament.name || "大会"}を管理対象にする`;
    if (isActive) button.setAttribute("aria-current", "true");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      loadTournament(item.id);
    });
    button.innerHTML = `
      <strong>${escapeHtml(item.tournament.name || "無題の大会")}</strong>
      <span>${statusLabel(item.tournament.status)} / ${formatStartAt(item.tournament.startAt)}</span>
      <em class="tournament-list-select">${isActive ? "選択中" : "選択"}</em>
    `;
    els.tournamentList.append(button);
  });
}

function renderTournamentForm() {
  if (!hasTournament()) {
    els.tournamentName.value = "";
    els.tournamentStart.value = "";
    els.tournamentStatus.value = "entry";
    els.tournamentFormatType.value = "sixGame";
    els.tournamentMaxPlayers.value = 256;
    els.tournamentLobbyRule.value = "every2Games";
    if (els.tournamentContactLabel) els.tournamentContactLabel.value = "運営Discord";
    if (els.tournamentContactUrl) els.tournamentContactUrl.value = "";
    els.formatStages.innerHTML = `<div class="empty-state">編集する大会がありません。</div>`;
    return;
  }
  els.tournamentName.value = state.tournament.name || "";
  els.tournamentStart.value = state.tournament.startAt || "";
  els.tournamentStatus.value = state.tournament.status === "upcoming" ? "entry" : state.tournament.status || "entry";
  els.tournamentFormatType.value = state.tournament.formatType === "openSwiss" ? "sixGame" : state.tournament.formatType || "sixGame";
  els.tournamentMaxPlayers.value = state.tournament.maxPlayers || 256;
  els.tournamentLobbyRule.value = state.tournament.lobbyRule || defaultLobbyRuleForFormat(state.tournament.formatType);
  if (els.tournamentContactLabel) els.tournamentContactLabel.value = state.tournament.contactLabel || "運営Discord";
  if (els.tournamentContactUrl) els.tournamentContactUrl.value = state.tournament.contactUrl || "";
  renderFormatStages();
}

function setTournamentStatus(status) {
  if (!hasTournament()) {
    notify("大会がありません", "先に大会を作成してください。", "warn");
    return;
  }
  if (status === "live") {
    const startCheck = validateTournamentStart();
    if (startCheck.blockers.length) {
      notify("大会開始前の確認が必要", startCheck.blockers[0], "error");
      renderStartReadiness(startCheck);
      go("admin");
      return;
    }
    const warningText = startCheck.warnings.length ? `\n\n注意:\n${startCheck.warnings.map((item) => `・${item}`).join("\n")}` : "";
    if (!confirm(`チェックイン状況を確認しましたか？\n大会を開始すると最初のロビーだけ自動生成され、ユーザー側にテーブル情報が表示されます。${warningText}`)) return;
    finalizeCheckInList({ force: true });
  }
  if (["entry", "checkin"].includes(status)) {
    delete state.tournament.checkInFinalizedAt;
    const maxPlayers = Number(state.tournament?.maxPlayers || 256);
    state.players.forEach((player, index) => {
      player.didNotCheckIn = false;
      player.isSubstitute = index >= maxPlayers;
    });
    state.lobbies = [];
    state.lobbyHosts = [];
    state.results = {};
    state.reports = [];
  }
  state.tournament.status = status;
  if (status === "live") generateNextLobbyBlock({ silent: true });
  render();
  go("home");
}

function validateTournamentStart() {
  const blockers = [];
  const warnings = [];
  if (!hasTournament()) blockers.push("先に大会を作成してください。");
  if (!state.tournament?.startAt) blockers.push("開始日時が未設定です。");

  const checked = checkedInPlayerList();
  const maxPlayers = Number(state.tournament?.maxPlayers || 256);
  const officialPlayers = checked.slice(0, maxPlayers);
  if (!officialPlayers.length) blockers.push("チェックイン済みの参加者がいません。");
  if (officialPlayers.length && officialPlayers.length < 8) warnings.push(`チェックイン済みが${officialPlayers.length}名です。8名未満で開始する場合は手動運用が必要です。`);

  const missingRequired = officialPlayers.filter((player) => !player.displayName || !player.riotId || !player.discordId);
  if (missingRequired.length) blockers.push(`表示名、Riot ID、Discord IDが不足している参加者が${missingRequired.length}名います。`);

  const invalidRiot = officialPlayers.filter((player) => player.riotId && !isValidRiotId(player.riotId));
  if (invalidRiot.length) blockers.push(`Riot IDの形式が不正な参加者が${invalidRiot.length}名います。`);

  const existingLobbyCount = (state.lobbies || []).reduce((sum, block) => sum + (block?.length || 0), 0);
  const existingResultCount = Object.values(state.results || {}).reduce((sum, game) => sum + Object.keys(game || {}).length, 0);
  if (existingLobbyCount || existingResultCount || state.reports?.length) {
    warnings.push("既存のロビー、結果、提出履歴があります。開始時に現在のロビー/結果/提出履歴は初期化されます。");
  }

  return {
    blockers,
    warnings,
    checkedCount: checked.length,
    officialCount: officialPlayers.length,
    missingRequired,
    invalidRiot,
  };
}

function renderFormatStages() {
  const stages = state.tournament?.stages?.length ? state.tournament.stages : defaultStages();
  els.formatStages.innerHTML = "";
  stages.forEach((stage, index) => {
    const row = document.createElement("div");
    row.className = "stage-row";
    row.innerHTML = `
      <label>ステージ名<input class="stage-name" data-index="${index}" value="${escapeHtml(stage.name || "")}" placeholder="例: Day1 / Round of 256" /></label>
      <label>詳細<input class="stage-detail" data-index="${index}" value="${escapeHtml(stage.detail || "")}" placeholder="例: 256名 → 128名 / 6戦" /></label>
      <button class="danger-button remove-stage" type="button" data-index="${index}">削除</button>
    `;
    els.formatStages.append(row);
  });
}

function renderPlayersTable() {
  els.playersTable.innerHTML = "";
  if (!state.players.length) {
    els.playersTable.innerHTML = `<tr><td colspan="8">まだ参加者が登録されていません。</td></tr>`;
    return;
  }

  state.players.forEach((player) => {
    const row = document.createElement("tr");
    const checkInLabel = player.checkedInAt ? "済" : player.didNotCheckIn ? "未 / 不参加" : "未";
    row.dataset.playerRow = player.id;
    row.innerHTML = `
      <td><button class="sub-toggle ${player.isSubstitute ? "is-sub" : ""}" type="button" data-id="${player.id}">${player.isSubstitute ? "補欠" : "参加"}</button></td>
      <td>${escapeHtml(checkInLabel)}</td>
      <td><input class="admin-player-input" data-id="${escapeHtml(player.id)}" data-field="displayName" value="${escapeHtml(player.displayName || "")}" aria-label="表示名" /></td>
      <td><input class="admin-player-input" data-id="${escapeHtml(player.id)}" data-field="riotId" value="${escapeHtml(player.riotId || "")}" aria-label="Riot ID" /></td>
      <td><input class="admin-player-input" data-id="${escapeHtml(player.id)}" data-field="discordId" value="${escapeHtml(player.discordId || "")}" aria-label="Discord ID" /></td>
      <td><input class="admin-player-input" data-id="${escapeHtml(player.id)}" data-field="xAccount" value="${escapeHtml(player.xAccount || "")}" aria-label="X" /></td>
      <td><input class="admin-player-input" type="email" data-id="${escapeHtml(player.id)}" data-field="accountEmail" value="${escapeHtml(player.accountEmail || "")}" aria-label="メール" /></td>
      <td><button class="remove-player" type="button" data-id="${player.id}">×</button></td>
    `;
    els.playersTable.append(row);
  });
}

function updateAdminPlayerField(playerId, field, value) {
  const allowed = new Set(["displayName", "riotId", "discordId", "xAccount", "accountEmail"]);
  if (!allowed.has(field)) return;
  const player = getPlayer(playerId);
  if (!player) return;
  const nextValue = String(value || "").trim();
  if (["displayName", "riotId", "discordId"].includes(field) && !nextValue) {
    notify("入力不足", "表示名、Riot ID、Discord IDは空にできません。", "warn");
    renderPlayersTable();
    return;
  }
  if (field === "riotId" && !isValidRiotId(nextValue)) {
    notify("Riot IDを確認", "サモナーネーム#タグ の形式で入力してください。例: SummonerName#JP1", "warn");
    renderPlayersTable();
    return;
  }
  if (field === "accountEmail" && nextValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValue)) {
    notify("メールアドレスを確認", "有効なメールアドレスを入力してください。", "warn");
    renderPlayersTable();
    return;
  }

  const previous = { ...player };
  player[field] = nextValue;
  updatePlayerInSnapshots(playerId, field, nextValue);
  syncAccountProfileFromAdmin(previous, { ...previous, [field]: nextValue });
  if (currentUserId === playerId) {
    currentProfile = { ...(currentProfile || {}), [field]: nextValue };
    persistCurrentProfile();
  } else {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  notify("参加者情報を更新", `${player.displayName || "参加者"} の情報を保存しました。`, "success");
  render();
}

function updatePlayerInSnapshots(playerId, field, value) {
  (state.tournaments || []).forEach((item) => {
    (item.players || []).forEach((player) => {
      if (player.id === playerId) player[field] = value;
    });
  });
}

function syncAccountProfileFromAdmin(previous, updated) {
  Object.keys(accounts || {}).forEach((key) => {
    const profile = accounts[key]?.profile;
    if (!profileMatchesPlayer(profile, previous)) return;
    accounts[key].profile = { ...profile, ...updated };
  });
}

function profileMatchesPlayer(profile, player) {
  if (!profile || !player) return false;
  return [profile.riotId, profile.discordId, profile.displayName]
    .filter(Boolean)
    .some((value) => [player.riotId, player.discordId, player.displayName].some((target) => normalize(value) && normalize(value) === normalize(target)));
}

function renderLobbyGenerateButtons() {
  const blocks = getLobbyBlocks();
  els.blockActions.innerHTML = blocks
    .map((block, index) => `<button class="secondary-button generate-block" data-block="${index}" type="button">Game ${block.games.join("-")} 再生成</button>`)
    .join("");
}

function renderLobbies() {
  els.lobbyOutput.innerHTML = "";
  if (!state.players.length) {
    els.lobbyOutput.innerHTML = `<div class="empty-state">参加者登録後に生成できます。</div>`;
    return;
  }

  getLobbyBlocks().forEach((block, blockIndex) => {
    const lobbies = state.lobbies[blockIndex] || [];
    const section = document.createElement("section");
    section.className = "lobby";
    section.innerHTML = `<h4>${block.label} / Game ${block.games.join("・")}</h4>`;
    if (!lobbies.length) {
      section.insertAdjacentHTML("beforeend", `<p>未生成</p>`);
    } else {
      lobbies.forEach((lobby, lobbyIndex) => {
        section.insertAdjacentHTML("beforeend", `<p>Lobby ${lobbyIndex + 1}</p>`);
        const ol = document.createElement("ol");
        lobby.forEach((playerId) => {
          const li = document.createElement("li");
          const player = getPlayer(playerId);
          li.textContent = player ? `${summonerName(player.riotId) || player.displayName} #${riotTag(player.riotId)}` : "削除済み";
          ol.append(li);
        });
        section.append(ol);
      });
    }
    els.lobbyOutput.append(section);
  });
}

function renderAdminResults() {
  els.adminResultsOutput.innerHTML = "";
  const history = document.createElement("section");
  history.className = "report-history";
  history.innerHTML = `
    <div class="report-history-head">
      <div>
        <h4>提出履歴</h4>
        <p>誰が、どの試合・ロビーを、画像/手動どちらで提出したか確認できます。</p>
      </div>
      <span>${state.reports.length}件</span>
    </div>
  `;
  if (!state.reports.length) {
    history.insertAdjacentHTML("beforeend", `<div class="empty-state">まだ結果報告はありません。</div>`);
  } else {
    state.reports.slice(0, 24).forEach((report) => {
      const submitter = report.submitter || {};
      const winner = getPlayer(report.winnerId) || (submitter.id ? getPlayer(submitter.id) : null);
      const matchSummary = summarizeReportMatches(report.matches || []);
      const status = report.status || "approved";
      const statusLabel = { pending: "承認待ち", approved: "承認済み", rejected: "却下" }[status] || "承認済み";
      const methodLabel = { image: "画像提出", manual: "手動提出", debug: "デバッグ自動" }[report.method] || "提出";
      const item = document.createElement("article");
      item.className = `report-history-item ${report.method === "image" ? "is-image" : "is-manual"} is-${status}`;
      item.innerHTML = `
        <div class="report-history-main">
          <span class="report-method">${escapeHtml(methodLabel)}</span>
          <span class="report-review-status">${escapeHtml(statusLabel)}</span>
          <strong>${escapeHtml(report.tournamentName || state.tournament?.name || "大会未選択")} / Game ${escapeHtml(String(report.game || "-"))} / Lobby ${escapeHtml(String(report.lobby || "-"))}</strong>
          <small>${escapeHtml(formatReportTime(report.submittedAt))}</small>
        </div>
        <div class="report-history-person">
          <span>提出者</span>
          <strong>${escapeHtml(submitter.displayName || "不明")}</strong>
          <small>${escapeHtml([submitter.riotId, submitter.discordId].filter(Boolean).join(" / ") || "-")}</small>
          ${submitter.xAccount ? `<small>${escapeHtml(submitter.xAccount)}</small>` : ""}
        </div>
        <div class="report-history-person">
          <span>報告者アカウント</span>
          <strong>${escapeHtml(winner?.displayName || "未選択")}</strong>
          <small>${escapeHtml(winner?.riotId || submitter.riotId || "-")}</small>
        </div>
        <div class="report-history-matches">
          <span>提出内容</span>
          <strong>${matchSummary.count}名 / ${matchSummary.completeness}</strong>
          <small>${escapeHtml(matchSummary.text)}</small>
          ${status === "pending" ? `
            <div class="report-review-actions">
              <button class="primary-button approve-report" type="button" data-report-id="${escapeHtml(report.id)}">承認して反映</button>
              <button class="danger-button reject-report" type="button" data-report-id="${escapeHtml(report.id)}">却下</button>
            </div>
          ` : report.reviewedAt ? `<small>確認: ${escapeHtml(formatReportTime(report.reviewedAt))}</small>` : ""}
        </div>
      `;
      history.append(item);
    });
  }
  els.adminResultsOutput.append(history);

  [1, 2, 3, 4, 5, 6].forEach((gameNo) => {
    const blockIndex = getBlockIndex(gameNo);
    const lobbies = state.lobbies[blockIndex] || [];
    const card = document.createElement("section");
    card.className = "lobby";
    card.innerHTML = `<h4>Game ${gameNo}</h4>`;

    if (!lobbies.length) {
      card.insertAdjacentHTML("beforeend", `<p>ロビー未生成</p>`);
    } else {
      lobbies.forEach((lobby, lobbyIndex) => {
        card.insertAdjacentHTML("beforeend", `<p>Lobby ${lobbyIndex + 1}</p>`);
        lobby.forEach((playerId) => {
          const player = getPlayer(playerId);
          if (!player) return;
          const row = document.createElement("label");
          row.className = "result-row";
          row.innerHTML = `<span class="player-meta"><strong>${escapeHtml(player.displayName)}</strong><span>${escapeHtml(player.discordId)}</span></span>`;
          const select = document.createElement("select");
          select.dataset.game = String(gameNo);
          select.dataset.player = player.id;
          select.innerHTML = els.placementTemplate.innerHTML;
          select.value = state.results[gameNo]?.[player.id] || "";
          row.append(select);
          card.append(row);
        });
      });
    }

    els.adminResultsOutput.append(card);
  });
}

function summarizeReportMatches(matches) {
  const normalized = (matches || [])
    .map((match) => {
      const player = getPlayer(match.playerId);
      return {
        placement: Number(match.placement),
        name: summonerName(player?.riotId || "") || player?.displayName || "不明",
      };
    })
    .filter((match) => match.placement)
    .sort((a, b) => a.placement - b.placement);
  const count = normalized.length;
  const completeness = count >= 8 ? "8名分" : count >= 4 ? "確認可" : "要確認";
  const text = normalized.length
    ? normalized.map((match) => `${match.placement}位 ${match.name}`).join(" / ")
    : "提出内容なし";
  return { count, completeness, text };
}

function approveReport(reportId) {
  const report = (state.reports || []).find((item) => item.id === reportId);
  if (!report) return;
  if (report.status === "approved") {
    notify("承認済み", "この報告はすでに反映されています。", "warn");
    return;
  }
  const gameNo = Number(report.game);
  if (!gameNo || !(report.matches || []).length) {
    notify("承認できません", "報告内容が不足しています。", "warn");
    return;
  }
  state.results[gameNo] = state.results[gameNo] || {};
  (report.matches || []).forEach((match) => {
    if (match.playerId && match.placement) state.results[gameNo][match.playerId] = String(match.placement);
  });
  report.status = "approved";
  report.reviewedAt = new Date().toISOString();
  report.reviewedBy = "admin";
  maybeFinishTournamentAutomatically();
  maybeGenerateNextLobbyBlock();
  render();
  notify("結果を承認しました", `Game ${gameNo} の結果を反映しました。`, "success");
}

function rejectReport(reportId) {
  const report = (state.reports || []).find((item) => item.id === reportId);
  if (!report) return;
  if (!confirm("この結果報告を却下しますか？")) return;
  report.status = "rejected";
  report.reviewedAt = new Date().toISOString();
  report.reviewedBy = "admin";
  render();
  notify("報告を却下しました", "結果には反映していません。", "success");
}

function renderStandings() {
  const standings = calculateStandings();
  els.standingsTable.innerHTML = "";
  if (!standings.length) {
    els.standingsTable.innerHTML = `<tr><td colspan="7">結果入力後に表示されます。</td></tr>`;
    return;
  }

  standings.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td><div class="player-meta"><strong>${escapeHtml(row.player.displayName)}</strong><span>${escapeHtml(row.player.discordId)}</span></div></td>
      <td><strong>${row.points}</strong></td>
      <td>${row.average ? row.average.toFixed(2) : "-"}</td>
      <td>${row.firstRate ? `${Math.round(row.firstRate * 100)}%` : "-"}</td>
      <td>${row.top4Rate ? `${Math.round(row.top4Rate * 100)}%` : "-"}</td>
      <td><div class="history">${row.history.map((placement) => `<span>${placement || "-"}</span>`).join("")}</div></td>
    `;
    els.standingsTable.append(tr);
  });
}

async function analyzeReportImage() {
  const lobby = getSelectedLobby();
  if (!lobby.length) return setReportStatus("あなたの現在の報告対象ロビーがありません。ロビー生成後、または未報告の試合がある場合に提出できます。");
  if (!selectedReportFile) return setReportStatus("先にスクリーンショットを選択してください。");
  if (!window.Tesseract) return setReportStatus("OCRを読み込めませんでした。画像提出できない場合は手動報告を使ってください。");

  setReportStatus("画像解析中... 0%");
  const { data } = await Tesseract.recognize(selectedReportFile, "eng+jpn", {
    logger: (progress) => {
      if (progress.status === "recognizing text") {
        setReportStatus(`画像解析中... ${Math.round(progress.progress * 100)}%`);
      }
    },
  });
  latestReportMatches = matchOcrToPlayers(data.text || "", lobby);
  renderReportMatches();
  if (latestReportMatches.length < 2) {
    setReportStatus("十分に認識できませんでした。画像が提出できない場合のみ手動報告を使ってください。");
  } else {
    setReportStatus(`${latestReportMatches.length}人を認識しました。内容確認後に報告してください。`);
  }
}

function submitOcrReport() {
  if (!latestReportMatches.length) return setReportStatus("認識結果がありません。先に画像認識してください。");
  const gameNo = els.reportGame.value;
  if (!gameNo) return setReportStatus("あなたの現在の報告対象ロビーがありません。");
  const validation = validateReportMatches(latestReportMatches);
  if (!validation.ok) return setReportStatus(validation.message);
  addReport("image", latestReportMatches);
  setReportStatus("報告を受け付けました。管理者の承認後に結果へ反映されます。");
  render();
}

function submitManualReport() {
  const gameNo = els.reportGame.value;
  if (!gameNo) return setReportStatus("あなたの現在の報告対象ロビーがありません。");
  const rows = [...els.manualFallbackRows.querySelectorAll("select")];
  const matches = rows
    .map((select) => ({ playerId: select.dataset.player, placement: Number(select.value), confidence: 1 }))
    .filter((match) => match.placement);
  if (!matches.length) return setReportStatus("手動報告の着順が未入力です。");
  const validation = validateReportMatches(matches);
  if (!validation.ok) return setReportStatus(validation.message);

  addReport("manual", matches);
  setReportStatus("手動報告を受け付けました。管理者の承認後に結果へ反映されます。");
  render();
}

function addReport(method, matches) {
  const submitterPlayer = getPlayer(currentUserId);
  const submitterProfile = submitterPlayer || currentProfile || {};
  const target = getCurrentReportTarget();
  state.reports.unshift({
    id: uid(),
    tournamentId: state.activeTournamentId || state.tournament?.id || "",
    tournamentName: state.tournament?.name || "",
    method,
    game: target?.game || Number(els.reportGame.value),
    lobby: target ? target.lobbyIndex + 1 : Number(els.reportLobby.value) + 1,
    winnerId: currentUserId || "",
    submitter: {
      id: currentUserId || "",
      displayName: submitterProfile.displayName || "",
      riotId: submitterProfile.riotId || "",
      discordId: submitterProfile.discordId || "",
      xAccount: submitterProfile.xAccount || "",
    },
    submittedAt: new Date().toISOString(),
    status: "pending",
    reviewedAt: "",
    reviewedBy: "",
    matches,
  });
}

function validateReportMatches(matches) {
  const target = getCurrentReportTarget();
  if (!target) return { ok: false, message: "あなたの現在の報告対象ロビーがありません。" };
  const lobbyIds = new Set(target.lobby || []);
  const normalized = (matches || []).filter((match) => match.playerId && match.placement);
  if (!normalized.length) return { ok: false, message: "着順が未入力です。" };

  const outsidePlayers = normalized.filter((match) => !lobbyIds.has(match.playerId));
  if (outsidePlayers.length) {
    return { ok: false, message: "報告対象ロビー外の選手が含まれています。ロビー情報を確認してください。" };
  }

  const duplicatePlayers = findDuplicates(normalized.map((match) => match.playerId));
  if (duplicatePlayers.length) {
    return { ok: false, message: "同じ選手が複数回入っています。認識結果または手動入力を確認してください。" };
  }

  const placements = normalized.map((match) => Number(match.placement));
  const invalidPlacement = placements.find((placement) => !Number.isInteger(placement) || placement < 1 || placement > 8);
  if (invalidPlacement) {
    return { ok: false, message: "着順は1位から8位で入力してください。" };
  }

  const duplicatePlacements = findDuplicates(placements);
  if (duplicatePlacements.length) {
    return { ok: false, message: `同じ着順が重複しています: ${duplicatePlacements.join(", ")}位` };
  }

  const existing = state.results?.[target.game] || {};
  const alreadyReported = normalized.filter((match) => existing[match.playerId]);
  if (alreadyReported.length) {
    return { ok: false, message: "この試合はすでに一部結果が入っています。修正が必要な場合は管理者へ連絡してください。" };
  }

  const pendingReport = (state.reports || []).find((report) => (
    report.status !== "rejected"
    && Number(report.game) === Number(target.game)
    && Number(report.lobby) === Number(target.lobbyIndex + 1)
  ));
  if (pendingReport) {
    return { ok: false, message: "この試合はすでに報告済み、または承認待ちです。管理者の確認を待ってください。" };
  }

  if (normalized.length < Math.min(4, target.lobby.length)) {
    return { ok: false, message: "認識人数が少なすぎます。画像を撮り直すか、画像を提出できない場合のみ手動報告してください。" };
  }

  return { ok: true, message: "" };
}

function formatReportTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderReportMatches() {
  els.reportMatches.innerHTML = "";
  const validation = latestReportMatches.length ? validateReportMatches(latestReportMatches) : { ok: true };
  latestReportMatches.forEach((match) => {
    const player = getPlayer(match.playerId);
    const li = document.createElement("li");
    li.textContent = `${match.placement}位: ${player?.displayName || "不明"} (${Math.round(match.confidence * 100)}%)`;
    els.reportMatches.append(li);
  });
  els.reportMatches.classList.toggle("has-report-warning", !validation.ok);
  if (!validation.ok) {
    const li = document.createElement("li");
    li.className = "report-warning-row";
    li.textContent = validation.message;
    els.reportMatches.append(li);
  }
}

function setReportStatus(message) {
  els.reportStatus.textContent = message;
}

function readStageRows() {
  return [...els.formatStages.querySelectorAll(".stage-row")]
    .map((row) => ({
      name: row.querySelector(".stage-name").value.trim(),
      detail: row.querySelector(".stage-detail").value.trim(),
    }))
    .filter((stage) => stage.name || stage.detail);
}

function getLobbyPlayerPool() {
  const mainPlayers = state.players.filter((player) => !player.isSubstitute);
  if (["checkin", "ready", "live", "finished"].includes(state.tournament?.status)) {
    return mainPlayers.filter((player) => player.checkedInAt);
  }
  return [];
}

function isBlockComplete(blockIndex) {
  const block = getLobbyBlocks()[blockIndex];
  const lobbies = state.lobbies?.[blockIndex] || [];
  if (!block || !lobbies.length) return false;
  return block.games.every((gameNo) => lobbies.every((lobby) => {
    const results = state.results[gameNo] || {};
    return lobby.length && lobby.every((playerId) => results[playerId]);
  }));
}

function nextLobbyBlockIndex() {
  const blocks = getLobbyBlocks();
  for (let index = 0; index < blocks.length; index += 1) {
    if (!(state.lobbies?.[index] || []).length) return index;
    if (!isBlockComplete(index)) return -1;
  }
  return -1;
}

function buildLobbiesForBlock(blockIndex) {
  if (!state.players.length) return;
  const blocks = getLobbyBlocks();
  const block = blocks[blockIndex];
  if (!block) return;
  state.lobbies = state.lobbies || [];
  state.lobbyHosts = state.lobbyHosts || [];
  const shuffled = shuffle(getLobbyPlayerPool().map((player) => player.id));
  if (!shuffled.length) return;
  const lobbyCount = Math.max(1, Math.ceil(shuffled.length / 8));
  const lobbies = Array.from({ length: lobbyCount }, () => []);
  shuffled.forEach((playerId, index) => lobbies[index % lobbyCount].push(playerId));
  state.lobbies[blockIndex] = lobbies;
  state.lobbyHosts[blockIndex] = lobbies.map((lobby) => shuffle(lobby)[0] || "");
  block.games.forEach((gameNo) => { state.results[gameNo] = {}; });
}

function generateBlock(blockIndex) {
  buildLobbiesForBlock(blockIndex);
  autoReportDebugOnlyLobbies();
  render();
}

function generateAllLobbies({ silent = false } = {}) {
  generateNextLobbyBlock({ silent });
}

function generateNextLobbyBlock({ silent = false } = {}) {
  const index = nextLobbyBlockIndex();
  if (index < 0) return false;
  buildLobbiesForBlock(index);
  autoReportDebugOnlyLobbies();
  if (!silent) render();
  return true;
}

function maybeGenerateNextLobbyBlock() {
  if (state.tournament?.status !== "live") return;
  generateNextLobbyBlock({ silent: true });
}

function fillDebugPlayersToCapacity() {
  if (!hasTournament()) {
    notify("大会がありません", "先に大会を作成してください。", "warn");
    return;
  }
  const maxPlayers = Math.min(256, Math.max(8, Number(state.tournament?.maxPlayers || 256)));
  const mainPlayers = state.players.filter((player) => !player.isSubstitute);
  const needed = Math.max(0, maxPlayers - mainPlayers.length);
  if (!needed) {
    state.players.forEach((player) => {
      player.checkedInAt = player.checkedInAt || new Date().toISOString();
      player.didNotCheckIn = false;
      player.isSubstitute = false;
    });
    render();
    notify("満枠です", "既存参加者をチェックイン済みにしました。", "success");
    return;
  }
  const ok = confirm(`現在の大会にデバッグ参加者を${needed}名追加し、全員チェックイン済みにします。\n既存参加者は上書きしません。実行しますか？`);
  if (!ok) return;
  const checkedInAt = new Date().toISOString();
  const usedRiotIds = new Set(state.players.map((player) => normalize(player.riotId)));
  let added = 0;
  let seedIndex = 1;
  while (added < needed) {
    const number = String(seedIndex).padStart(3, "0");
    const riotId = `DebugPlayer${number}#JP1`;
    seedIndex += 1;
    if (usedRiotIds.has(normalize(riotId))) continue;
    usedRiotIds.add(normalize(riotId));
    state.players.push({
      id: uid(),
      displayName: `DebugPlayer${number}`,
      riotId,
      discordId: `@debug_player_${number}`,
      xAccount: `@tftrise_debug_${number}`,
      accountEmail: "",
      checkedInAt,
      isSubstitute: false,
      didNotCheckIn: false,
    });
    added += 1;
  }
  state.players.forEach((player) => {
    player.checkedInAt = player.checkedInAt || checkedInAt;
    player.didNotCheckIn = false;
    player.isSubstitute = false;
  });
  state.lobbies = [];
  state.lobbyHosts = [];
  state.results = {};
  state.reports = [];
  render();
  notify("デバッグ参加者を追加しました", `${added}名を追加し、${state.players.length}名をチェックイン済みにしました。`, "success");
}

function isDebugPlayer(player) {
  return /^DebugPlayer\d{3}/.test(player?.displayName || "") || /^DebugPlayer\d{3}#/.test(player?.riotId || "");
}

function autoReportDebugOnlyLobbies() {
  if (!hasTournament()) return 0;
  let created = 0;
  getLobbyBlocks().forEach((block, blockIndex) => {
    const lobbies = state.lobbies?.[blockIndex] || [];
    lobbies.forEach((lobby, lobbyIndex) => {
      const players = lobby.map((id) => getPlayer(id)).filter(Boolean);
      if (!players.length || !players.every(isDebugPlayer)) return;
      block.games.forEach((gameNo) => {
        const existing = state.results?.[gameNo] || {};
        if (players.some((player) => existing[player.id])) return;
        const placements = shuffle(players.map((player) => player.id)).map((playerId, index) => ({
          playerId,
          placement: index + 1,
          confidence: 1,
        }));
        state.results[gameNo] = state.results[gameNo] || {};
        placements.forEach((match) => {
          state.results[gameNo][match.playerId] = String(match.placement);
        });
        state.reports.unshift({
          id: uid(),
          tournamentId: state.activeTournamentId || state.tournament?.id || "",
          tournamentName: state.tournament?.name || "",
          method: "debug",
          game: gameNo,
          lobby: lobbyIndex + 1,
          winnerId: placements.find((match) => match.placement === 1)?.playerId || "",
          submitter: {
            id: "debug-auto",
            displayName: "Debug Auto",
            riotId: "",
            discordId: "",
            xAccount: "",
          },
          submittedAt: new Date().toISOString(),
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: "debug-auto",
          matches: placements,
        });
        created += 1;
      });
    });
  });
  if (created) {
    maybeFinishTournamentAutomatically();
  }
  return created;
}

function updateAdminResult(gameNo, playerId, placement) {
  state.results[gameNo] = state.results[gameNo] || {};
  if (placement) state.results[gameNo][playerId] = placement;
  else delete state.results[gameNo][playerId];
  maybeFinishTournamentAutomatically();
  maybeGenerateNextLobbyBlock();
  renderStandings();
  renderHome();
  saveState();
}

function calculateStandings() {
  return calculateTournamentStandings(state);
}

function calculateTournamentStandings(tournamentState) {
  const players = tournamentState.players || [];
  const results = tournamentState.results || {};
  return players
    .map((player) => {
      const history = [1, 2, 3, 4, 5, 6].map((gameNo) => Number(results[gameNo]?.[player.id] || 0));
      const played = history.filter(Boolean);
      const points = played.reduce((sum, placement) => sum + scoreForPlacement(placement), 0);
      const firsts = played.filter((placement) => placement === 1).length;
      const top4 = played.filter((placement) => placement >= 1 && placement <= 4).length;
      const firstRate = played.length ? firsts / played.length : 0;
      const top4Rate = played.length ? top4 / played.length : 0;
      const average = played.length ? played.reduce((sum, placement) => sum + placement, 0) / played.length : 0;
      const finalPlacement = history.slice().reverse().find(Boolean) || 99;
      return { player, history, points, firsts, firstRate, top4, top4Rate, average, finalPlacement };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.firstRate - a.firstRate ||
      b.firsts - a.firsts ||
      b.top4Rate - a.top4Rate ||
      a.average - b.average ||
      a.finalPlacement - b.finalPlacement ||
      a.player.displayName.localeCompare(b.player.displayName, "ja")
    );
}

function countCompletedGames() {
  const mainPlayers = state.players.filter((player) => !player.isSubstitute);
  return [1, 2, 3, 4, 5, 6].filter((gameNo) => {
    const values = Object.values(state.results[gameNo] || {}).filter(Boolean);
    return values.length === mainPlayers.length && values.length > 0;
  }).length;
}

function maybeFinishTournamentAutomatically() {
  if (state.tournament?.status !== "live") return;
  if (countCompletedGames() === 6) state.tournament.status = "finished";
}

function matchOcrToPlayers(text, lobby) {
  const lines = text.split(/\n+/).map(normalize).filter((line) => line.length >= 2);
  const matches = [];
  const used = new Set();
  for (const line of lines) {
    const best = lobby
      .map((id) => getPlayer(id))
      .filter(Boolean)
      .filter((player) => !used.has(player.id))
      .map((player) => ({
        player,
        score: Math.max(
          similarity(line, normalize(player.displayName)),
          similarity(line, normalize(player.riotId || "")),
          similarity(line, normalize((player.riotId || "").split("#")[0] || ""))
        ),
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= 0.46) {
      used.add(best.player.id);
      matches.push({ playerId: best.player.id, placement: matches.length + 1, confidence: best.score });
    }
    if (matches.length === lobby.length) break;
  }
  return matches;
}

function getSelectedLobby() {
  const target = getCurrentReportTarget();
  if (target) return target.lobby;
  const blockIndex = getBlockIndex(Number(els.reportGame.value));
  return (state.lobbies[blockIndex] || [])[Number(els.reportLobby.value)] || [];
}

function getBlockIndex(gameNo) {
  const index = getLobbyBlocks().findIndex((block) => block.games.includes(gameNo));
  return index >= 0 ? index : Math.floor((gameNo - 1) / 2);
}

function getLobbyRule() {
  return state.tournament?.lobbyRule || defaultLobbyRuleForFormat(state.tournament?.formatType);
}

function summonerName(riotId = "") {
  return String(riotId).split("#")[0].trim();
}

function riotTag(riotId = "") {
  const parts = String(riotId).split("#");
  return (parts[1] || "").trim();
}

function combineRiotId(name = "", tag = "") {
  const cleanName = String(name).trim();
  const cleanTag = String(tag).trim().replace(/^#/, "");
  return cleanName && cleanTag ? `${cleanName}#${cleanTag}` : "";
}

function isValidRiotId(riotId = "") {
  const [name, tag, ...rest] = String(riotId).trim().split("#");
  return Boolean(name?.trim() && tag?.trim() && !rest.length);
}

function playerRiotCopyMarkup(player) {
  const name = summonerName(player.riotId) || player.displayName || "";
  const tag = riotTag(player.riotId);
  return `
    <div class="riot-id-card">
      <div class="riot-id-main">
        <span>${escapeHtml(name)}</span>
        <small>${tag ? `#${escapeHtml(tag)}` : "#-"}</small>
      </div>
      <div class="riot-copy-actions">
        <button type="button" data-copy-value="${escapeHtml(name)}" data-copy-label="サモナーネーム">名前コピー</button>
        <button type="button" data-copy-value="${escapeHtml(tag)}" data-copy-label="タグ">タグコピー</button>
      </div>
    </div>
  `;
}

function playerRiotDisplayMarkup(player) {
  const name = summonerName(player.riotId) || player.displayName || "";
  const tag = riotTag(player.riotId);
  return `
    <div class="riot-id-card is-display-only">
      <div class="riot-id-main">
        <span>${escapeHtml(name)}</span>
        <small>${tag ? `#${escapeHtml(tag)}` : "#-"}</small>
      </div>
    </div>
  `;
}

function defaultLobbyRuleForFormat(formatType) {
  return formatType === "oneDayElim" ? "everyGame" : "every2Games";
}

function getLobbyBlocks() {
  if (getLobbyRule() === "everyGame") {
    return [1, 2, 3, 4, 5, 6].map((game) => ({ label: `Game ${game}`, games: [game] }));
  }
  return [
    { label: "Game 1-2", games: [1, 2] },
    { label: "Game 3-4", games: [3, 4] },
    { label: "Game 5-6", games: [5, 6] },
  ];
}

function getPlayer(id) {
  return state.players.find((player) => player.id === id);
}

function formatStartAt(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status) {
  return {
    entry: "エントリー受付中",
    checkin: "チェックイン受付中",
    ready: "開始確認待ち",
    live: "開催中",
    finished: "終了",
  }[status === "upcoming" ? "entry" : status] || "エントリー受付中";
}

function statusMessage(status) {
  return {
    entry: "この大会は現在、参加者募集中です。",
    checkin: "この大会は現在、チェックイン受付中です。",
    ready: "チェックイン受付は終了しました。運営の開始確認待ちです。",
    live: "この大会は現在進行中です。",
    finished: "この大会は終了しています。",
  }[status === "upcoming" ? "entry" : status] || "この大会は現在、参加者募集中です。";
}

function formatTypeLabel(type) {
  return {
    sixGame: "6戦総合pt式",
    oneDayElim: "1日完結型（鰹節杯ルール）256→決勝",
    multiDay: "TPC式 Day1 / Day2 / 決勝",
    custom: "カスタム",
  }[type] || "6戦総合pt式";
}

function lobbyRuleLabel(type) {
  return {
    everyGame: "毎試合抽選",
    every2Games: "2試合ごとに抽選",
  }[type] || "2試合ごとに抽選";
}

function formatTemplate(type) {
  if (type === "sixGame" || type === "openSwiss") {
    return [
      { name: "参加規模", detail: "8〜256人で開催。参加者を8人ロビーに分けて進行。" },
      { name: "Game 1-2", detail: "初回抽選ロビーで2戦実施。" },
      { name: "Game 3-4", detail: "全参加者を再抽選して2戦実施。" },
      { name: "Game 5-6", detail: "全参加者を再抽選して2戦実施。" },
      { name: "最終順位", detail: "6戦の合計ポイントで総合順位を決定。上位者は上位大会への出場権を獲得できる。" },
    ];
  }
  if (type === "oneDayElim") {
    return [
      { name: "Round of 256", detail: "256名で開始。ラウンド開始時に全ロビーを抽選し、各ロビー上位が次ラウンドへ進出。" },
      { name: "Round of 128", detail: "進出者128名でロビーを再抽選し、64名へ絞り込み。" },
      { name: "Round of 64", detail: "進出者64名でロビーを再抽選し、32名へ絞り込み。" },
      { name: "Round of 32", detail: "進出者32名でロビーを再抽選し、16名へ絞り込み。" },
      { name: "Round of 16", detail: "進出者16名でロビーを再抽選し、決勝進出者を決定。" },
      { name: "決勝", detail: "決勝進出者で最終ロビーを作成し、最終順位を決定。" },
    ];
  }
  if (type === "multiDay") {
    return [
      { name: "Day 1 / 32→24", detail: "32人4ロビーで6試合。2試合ごとにロビーを再抽選し、下位8人をカット。上位24人がDay 2へ進出。" },
      { name: "Day 2 / 24→8", detail: "Match 1-2は3ロビーで下位8人をカット。Match 3-4は2ロビーで下位4人をカット。Match 5-6は1ロビーで下位4人をカットし、上位8人がDay 3決勝へ進出。" },
      { name: "Day 3 / 決勝", detail: "8人1ロビーでチェックメイト20pt方式。20ptに到達した選手が、その後の試合で1位を取った時点で優勝。" },
      { name: "決勝順位", detail: "優勝者確定後、残りの順位は最終スタンディングに基づいて確定。" },
    ];
  }
  return [
    { name: "予選", detail: "全6戦。2戦ごとにロビーを再抽選し、合計ポイントで総合順位を決定。" },
  ];
}
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(value) {
  return String(value).toLowerCase().normalize("NFKC").replace(/[#＃].*$/, "").replace(/[^a-z0-9ぁ-んァ-ン一-龥]/g, "");
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    go(button.dataset.go);
  });
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-value]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const value = button.dataset.copyValue || "";
  if (!value) return;
  const label = button.dataset.copyLabel || "テキスト";
  const original = button.textContent;
  const copied = await copyText(value);
  if (copied) {
    button.textContent = "コピー済み";
    showToast("コピーしました", `${label}: ${value}`);
    setTimeout(() => { button.textContent = original; }, 1200);
    return;
  }
  showToast("コピーできませんでした", "表示された文字を手動でコピーしてください。");
  prompt("コピーしてください", value);
});

async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
  }
}

document.querySelectorAll(".auth-mode").forEach((button) => {
  button.addEventListener("click", () => {
    authMode = button.dataset.authMode;
    renderAuthMode();
  });
});

els.tournamentCard.addEventListener("click", (event) => {
  if (event.target.closest("[data-go]")) return;
  els.tournamentDialog.showModal();
});

els.tournamentCard.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  els.tournamentDialog.showModal();
});

els.dialogCloseBtn.addEventListener("click", () => els.tournamentDialog.close());

els.tournamentDialog.addEventListener("click", (event) => {
  if (event.target === els.tournamentDialog) els.tournamentDialog.close();
});

els.dialogEntryBtn.addEventListener("click", () => {
  els.tournamentDialog.close();
  if (getPlayer(currentUserId)) {
    go("mypage");
    return;
  }
  requestEntryWithNotice();
});

els.dialogReportBtn.addEventListener("click", () => {
  els.tournamentDialog.close();
  go("report");
});

els.homeEntryBtn.addEventListener("click", () => {
  requestEntryWithNotice();
});

els.entryNoticeAgreeBtn.addEventListener("click", acceptEntryNotice);
els.entryNoticeCancelBtn.addEventListener("click", () => els.entryNoticeDialog.close());
els.entryTimelineConfirm.addEventListener("change", () => {
  updateEntryNoticeAgreeState();
});
els.entryRuleConfirm?.addEventListener("change", updateEntryNoticeAgreeState);
els.entryNoticeDialog.addEventListener("click", (event) => {
  if (event.target === els.entryNoticeDialog) els.entryNoticeDialog.close();
});

els.dialogDetailToggle.addEventListener("click", () => {
  const isHidden = els.publicFormatDetails.classList.toggle("hidden");
  if (!isHidden) {
    els.publicTimelineDetails.classList.add("hidden");
    els.dialogTimelineToggle.textContent = "タイムライン";
  }
  els.dialogDetailToggle.textContent = isHidden ? "大会詳細" : "詳細を閉じる";
});

els.dialogTimelineToggle.addEventListener("click", () => {
  const isHidden = els.publicTimelineDetails.classList.toggle("hidden");
  if (!isHidden) {
    els.publicFormatDetails.classList.add("hidden");
    els.dialogDetailToggle.textContent = "大会詳細";
  }
  els.dialogTimelineToggle.textContent = isHidden ? "タイムライン" : "タイムラインを閉じる";
});

els.hostDialogCloseBtn.addEventListener("click", () => els.hostDialog.close());
els.openLobbyGuideBtn.addEventListener("click", () => els.lobbyGuideDialog.showModal());
els.guideCloseBtn.addEventListener("click", () => els.lobbyGuideDialog.close());
els.lobbyGuideDialog.addEventListener("click", (event) => {
  if (event.target === els.lobbyGuideDialog) els.lobbyGuideDialog.close();
});

els.myLobbyOutput.addEventListener("click", (event) => {
  if (!event.target.closest(".lobby-guide-button")) return;
  els.lobbyGuideDialog.showModal();
});

window.addEventListener("hashchange", () => {
  const target = location.hash.replace("#", "") || "home";
  if (document.getElementById(target)) go(target);
});

els.adminOpenBtn.addEventListener("click", () => go("admin"));
document.querySelector("#ownerOptionsBtn")?.addEventListener("click", (event) => {
  event.stopPropagation();
  go("admin");
});
els.logoutTopBtn.addEventListener("click", () => {
  currentUserId = "";
  currentProfile = null;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
  render();
  go("opening");
});
els.myEntryActions.addEventListener("click", (event) => {
  if (!event.target.closest(".cancel-entry-button")) return;
  cancelCurrentEntry();
});
els.myPageTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-my-tab]");
  if (!button) return;
  currentMyPageTab = button.dataset.myTab;
  localStorage.setItem(MY_PAGE_TAB_KEY, currentMyPageTab);
  renderMyPage();
});
els.myNextAction.addEventListener("click", (event) => {
  const checkIn = event.target.closest(".check-in-now");
  if (checkIn) {
    performCheckIn();
    return;
  }
  const goButton = event.target.closest("[data-go]");
  if (goButton) go(goButton.dataset.go);
});
els.myProfileOutput.addEventListener("submit", async (event) => {
  if (!["profileEditForm", "accountSecurityForm", "rewardCosmeticsForm"].includes(event.target.id)) return;
  event.preventDefault();
  const form = new FormData(event.target);
  if (event.target.id === "accountSecurityForm") {
    await updateAccountSecurity({
      accountEmail: form.get("accountEmail"),
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    });
    return;
  }
  if (event.target.id === "rewardCosmeticsForm") {
    updateRewardCosmetics({
      selectedTitle: form.get("selectedTitle"),
    });
    return;
  }
  updateCurrentProfile({
    displayName: String(form.get("displayName") || "").trim(),
    riotId: combineRiotId(form.get("riotName"), form.get("riotTag")),
    discordId: String(form.get("discordId") || "").trim(),
    xAccount: String(form.get("xAccount") || "").trim(),
  });
});

els.adminLoginBtn.addEventListener("click", () => {
  unlockAdminConsole(els.adminPin.value);
});

els.adminNextAction?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;
  executeAdminNextAction(button.dataset.adminAction);
});

els.tournamentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!hasTournament()) {
    notify("大会がありません", "先に「新しい大会を作成」を押してください。", "warn");
    return;
  }
  state.tournament = {
    id: state.tournament.id || state.activeTournamentId || uid(),
    name: els.tournamentName.value.trim() || "SPACE GODS CUP",
    startAt: els.tournamentStart.value,
    status: els.tournamentStatus.value,
    formatType: els.tournamentFormatType.value === "openSwiss" ? "sixGame" : els.tournamentFormatType.value,
    maxPlayers: Math.min(256, Math.max(8, Number(els.tournamentMaxPlayers.value || 256))),
    lobbyRule: els.tournamentLobbyRule.value,
    contactLabel: els.tournamentContactLabel?.value.trim() || "運営Discord",
    contactUrl: normalizeUrlInput(els.tournamentContactUrl?.value || ""),
    stages: readStageRows(),
  };
  render();
  go("home");
});

els.createTournamentBtn.addEventListener("click", createTournament);
els.deleteTournamentBtn.addEventListener("click", deleteCurrentTournament);
els.deleteAllTournamentsBtn.addEventListener("click", deleteAllTournaments);
els.deleteConfirmInput?.addEventListener("input", updateDeleteConfirmState);
els.deleteConfirmExecuteBtn?.addEventListener("click", executePendingDelete);
els.deleteConfirmCancelBtn?.addEventListener("click", closeDeleteConfirm);
els.deleteConfirmDialog?.addEventListener("click", (event) => {
  if (event.target === els.deleteConfirmDialog) {
    closeDeleteConfirm();
  }
});
els.deleteConfirmDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDeleteConfirm();
});
els.tournamentList.addEventListener("click", (event) => {
  const button = event.target.closest(".tournament-list-item");
  if (!button) return;
  closeDeleteConfirm();
  loadTournament(button.dataset.id);
});

els.tournamentCarousel.addEventListener("click", (event) => {
  const archiveButton = event.target.closest("[data-go='past']");
  if (archiveButton) {
    go("past");
    return;
  }
  const button = event.target.closest(".tournament-slide");
  if (!button || button.classList.contains("active")) return;
  closeDeleteConfirm();
  loadTournament(button.dataset.tournamentId);
  go("home");
});

els.openEntryBtn?.addEventListener("click", () => setTournamentStatus("entry"));
els.openCheckInBtn?.addEventListener("click", () => setTournamentStatus("checkin"));
els.startTournamentBtn.addEventListener("click", () => setTournamentStatus("live"));
els.finishTournamentBtn.addEventListener("click", () => setTournamentStatus("finished"));

els.tournamentFormatType.addEventListener("change", () => {
  if (!hasTournament()) return;
  state.tournament.formatType = els.tournamentFormatType.value === "openSwiss" ? "sixGame" : els.tournamentFormatType.value;
  state.tournament.lobbyRule = defaultLobbyRuleForFormat(els.tournamentFormatType.value);
  els.tournamentLobbyRule.value = state.tournament.lobbyRule;
  state.tournament.stages = formatTemplate(els.tournamentFormatType.value);
  renderFormatStages();
});

els.tournamentMaxPlayers.addEventListener("change", () => {
  if (!hasTournament()) return;
  state.tournament.maxPlayers = Math.min(256, Math.max(8, Number(els.tournamentMaxPlayers.value || 256)));
  els.tournamentMaxPlayers.value = state.tournament.maxPlayers;
  renderHome();
});

els.tournamentLobbyRule.addEventListener("change", () => {
  if (!hasTournament()) return;
  state.tournament.lobbyRule = els.tournamentLobbyRule.value;
  state.lobbies = [];
  state.lobbyHosts = [];
  state.results = {};
  state.reports = [];
  render();
});

document.querySelectorAll(".format-template").forEach((button) => {
  button.addEventListener("click", () => {
    if (!hasTournament()) return;
    state.tournament.formatType = button.dataset.template;
    state.tournament.lobbyRule = defaultLobbyRuleForFormat(button.dataset.template);
    state.tournament.stages = formatTemplate(button.dataset.template);
    renderTournamentForm();
  });
});

els.addStageBtn.addEventListener("click", () => {
  if (!hasTournament()) return;
  state.tournament.stages = readStageRows();
  state.tournament.stages.push({ name: "", detail: "" });
  renderFormatStages();
});

els.formatStages.addEventListener("input", () => {
  if (!hasTournament()) return;
  state.tournament.stages = readStageRows();
});

els.formatStages.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-stage");
  if (!button) return;
  if (!hasTournament()) return;
  state.tournament.stages = readStageRows().filter((_, index) => index !== Number(button.dataset.index));
  if (!state.tournament.stages.length) state.tournament.stages = [{ name: "", detail: "" }];
  renderFormatStages();
});

async function submitAuthForm() {
  const loginId = els.authLoginId.value.trim();
  const password = els.authPassword.value;
  const profileInput = {
    displayName: els.authDisplayName.value.trim(),
    riotId: combineRiotId(els.authRiotName.value, els.authRiotTag.value),
    discordId: els.authDiscordId.value.trim(),
    xAccount: els.authXAccount.value.trim(),
  };
  if (!loginId) {
    notify("入力不足", "ユーザー名またはメールアドレスを入力してください。", "warn");
    els.authLoginId.focus();
    return;
  }
  if (!password) {
    notify("入力不足", "パスワードを入力してください。", "warn");
    els.authPassword.focus();
    return;
  }
  if (authMode === "register") {
    if (!profileInput.displayName) {
      notify("入力不足", "表示名を入力してください。", "warn");
      els.authDisplayName.focus();
      return;
    }
    if (!els.authRiotName.value.trim() || !els.authRiotTag.value.trim()) {
      notify("入力不足", "Riot IDはサモナーネームと#タグの両方を入力してください。", "warn");
      (els.authRiotName.value.trim() ? els.authRiotTag : els.authRiotName).focus();
      return;
    }
    if (!profileInput.discordId) {
      notify("入力不足", "Discord IDを入力してください。", "warn");
      els.authDiscordId.focus();
      return;
    }
  }
  const authenticated = await authLoginOrRegister(loginId, password, profileInput);
  if (authenticated) els.authForm.reset();
}

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await submitAuthForm();
  } catch (error) {
    console.error(error);
    notify("登録に失敗しました", "ブラウザの保存機能でエラーが出ました。ページを更新してもう一度試してください。", "error");
  }
});

els.authSubmitBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    await submitAuthForm();
  } catch (error) {
    console.error(error);
    notify("登録に失敗しました", "ブラウザの保存機能でエラーが出ました。ページを更新してもう一度試してください。", "error");
  }
});

els.reportGame.addEventListener("change", renderReportSelectors);
els.reportLobby.addEventListener("change", () => {
  renderReportSubmitter();
  renderManualFallback();
});

els.homeCheckInBtn.addEventListener("click", performCheckIn);
els.checkInDialogBtn.addEventListener("click", performCheckIn);
els.checkInDialogCloseBtn.addEventListener("click", () => els.checkInDialog.close());

els.reportImage.addEventListener("change", () => {
  selectedReportFile = els.reportImage.files[0] || null;
  latestReportMatches = [];
  els.reportMatches.innerHTML = "";
  if (!selectedReportFile) return;
  els.reportPreview.src = URL.createObjectURL(selectedReportFile);
  els.reportPreview.classList.add("has-image");
  setReportStatus("画像を受け取りました。認識ボタンを押してください。");
});

els.analyzeReportBtn.addEventListener("click", () => analyzeReportImage().catch(() => setReportStatus("画像解析に失敗しました。手動報告を使ってください。")));
els.submitOcrBtn.addEventListener("click", submitOcrReport);
els.submitManualBtn.addEventListener("click", submitManualReport);

els.playersTable.addEventListener("change", (event) => {
  const input = event.target.closest(".admin-player-input");
  if (!input) return;
  updateAdminPlayerField(input.dataset.id, input.dataset.field, input.value);
});

els.playersTable.addEventListener("click", (event) => {
  const subButton = event.target.closest(".sub-toggle");
  if (subButton) {
    const player = getPlayer(subButton.dataset.id);
    if (!player) return;
    player.isSubstitute = !player.isSubstitute;
    render();
    return;
  }

  const button = event.target.closest(".remove-player");
  if (!button) return;
  const id = button.dataset.id;
  removePlayerFromTournament(id);
  if (currentUserId === id) {
    currentUserId = "";
    localStorage.removeItem(SESSION_KEY);
  }
  render();
});

els.blockActions.addEventListener("click", (event) => {
  const button = event.target.closest(".generate-block");
  if (!button) return;
  generateBlock(Number(button.dataset.block));
});
els.generateAllBtn.addEventListener("click", () => generateAllLobbies());
els.autoDebugResultsBtn?.addEventListener("click", () => {
  const created = autoReportDebugOnlyLobbies();
  render();
  if (created) notify("デバッグ結果を入力しました", `${created}試合分を自動入力しました。`, "success");
  else notify("対象なし", "デバッグ参加者だけの未入力ロビーはありません。", "warn");
});
els.seed256Btn.addEventListener("click", fillDebugPlayersToCapacity);
els.adminResultsOutput.addEventListener("change", (event) => {
  if (event.target.tagName !== "SELECT") return;
  updateAdminResult(event.target.dataset.game, event.target.dataset.player, event.target.value);
});
els.adminResultsOutput.addEventListener("click", (event) => {
  const approve = event.target.closest(".approve-report");
  if (approve) {
    approveReport(approve.dataset.reportId);
    return;
  }
  const reject = event.target.closest(".reject-report");
  if (reject) rejectReport(reject.dataset.reportId);
});

els.exportBtn.addEventListener("click", () => {
  exportStateBackup("manual-export");
});

els.importFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    state = { ...defaultState(), ...JSON.parse(await file.text()) };
    render();
  } catch {
    notify("JSON読込失敗", "JSONを読み込めませんでした。", "error");
  } finally {
    event.target.value = "";
  }
});

els.resetBtn.addEventListener("click", () => {
  if (!confirm("大会データをすべて初期化しますか？\n初期化前にバックアップJSONを自動保存します。")) return;
  exportStateBackup("before-reset");
  state = defaultState();
  render();
});

els.loadBackupsBtn?.addEventListener("click", loadStateBackups);
els.backupsOutput?.addEventListener("click", (event) => {
  const button = event.target.closest(".restore-backup");
  if (!button) return;
  restoreStateBackup(button.dataset.backupId);
});
els.runHealthCheckBtn?.addEventListener("click", runHealthCheck);
els.runDataAuditBtn?.addEventListener("click", runDataAudit);

go(location.hash.replace("#", "") || "home");
render();
