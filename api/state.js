const REMOTE_STATE_ID = "tftrise-main";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const keyMode = process.env.SUPABASE_SERVICE_ROLE_KEY ? "service" : "anon";

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ ok: false, message: "Supabaseのサーバー設定が不足しています。" });
    return;
  }

  if (req.method === "GET") {
    await readState({ res, supabaseUrl, supabaseKey });
    return;
  }

  if (req.method === "POST") {
    await writeState({ req, res, supabaseUrl, supabaseKey, keyMode });
    return;
  }

  res.status(405).json({ ok: false, message: "Method not allowed" });
};

async function readState({ res, supabaseUrl, supabaseKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${REMOTE_STATE_ID}&select=data`, {
    headers: apiHeaders(supabaseKey),
  });

  if (!response.ok) {
    res.status(response.status).json({ ok: false, message: "共有データを読み込めませんでした。" });
    return;
  }

  const rows = await response.json();
  res.status(200).json({ ok: true, data: normalizeServerState(rows?.[0]?.data || null) });
}

async function writeState({ req, res, supabaseUrl, supabaseKey, keyMode }) {
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  if (!body || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ ok: false, message: "保存データの形式が正しくありません。" });
    return;
  }

  const backupOk = keyMode === "service"
    ? await backupCurrentState({ supabaseUrl, supabaseKey })
    : false;

  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: {
      ...apiHeaders(supabaseKey),
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: REMOTE_STATE_ID,
      data: normalizeServerState(body.data),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    res.status(response.status).json({ ok: false, message: "共有データを保存できませんでした。" });
    return;
  }

  res.status(200).json({ ok: true, backupOk, keyMode });
}

async function backupCurrentState({ supabaseUrl, supabaseKey }) {
  try {
    const currentResponse = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${REMOTE_STATE_ID}&select=data`, {
      headers: apiHeaders(supabaseKey),
    });
    if (!currentResponse.ok) return false;
    const rows = await currentResponse.json();
    const currentData = rows?.[0]?.data;
    if (!currentData) return true;

    const backupResponse = await fetch(`${supabaseUrl}/rest/v1/app_state_backups`, {
      method: "POST",
      headers: apiHeaders(supabaseKey),
      body: JSON.stringify({
        state_id: REMOTE_STATE_ID,
        data: currentData,
        reason: "before-api-save",
      }),
    });
    return backupResponse.ok;
  } catch (error) {
    console.warn("TFTRise state backup failed:", error);
    return false;
  }
}

function apiHeaders(supabaseKey) {
  return {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
  };
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (_) {
    return {};
  }
}

function normalizeServerState(data) {
  if (!data || typeof data !== "object") return data;
  const normalized = clone(data);
  const snapshots = [];
  (normalized.tournaments || []).forEach((item) => snapshots.push(item));
  if (normalized.tournament) {
    snapshots.push({
      id: normalized.activeTournamentId || normalized.tournament.id,
      tournament: normalized.tournament,
      players: normalized.players,
      lobbies: normalized.lobbies,
      lobbyHosts: normalized.lobbyHosts,
      results: normalized.results,
      reports: normalized.reports,
    });
  }
  snapshots.forEach(normalizeTournamentSnapshot);
  normalized.activeTournamentId = chooseActiveTournamentId(normalized) || normalized.activeTournamentId;
  const active = (normalized.tournaments || []).find((item) => item.id === normalized.activeTournamentId);
  if (active) {
    normalized.tournament = active.tournament;
    normalized.players = active.players || [];
    normalized.lobbies = active.lobbies || [];
    normalized.lobbyHosts = active.lobbyHosts || [];
    normalized.results = active.results || {};
    normalized.reports = active.reports || [];
  }
  return normalized;
}

function chooseActiveTournamentId(state) {
  const tournaments = Array.isArray(state?.tournaments) ? state.tournaments : [];
  if (!tournaments.length) return "";
  const activeId = state?.activeTournamentId || "";
  const ranked = tournaments
    .map((item) => ({
      id: item.id,
      score: tournamentActivityScore(item, item.id === activeId),
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.id || tournaments[0]?.id || "";
}

function tournamentActivityScore(item, isCurrentActive) {
  const tournament = item?.tournament || {};
  const statusRank = { entry: 1, checkin: 4, ready: 5, live: 6, finished: 0 };
  const status = tournament.status === "upcoming" ? "entry" : tournament.status || "entry";
  const players = Array.isArray(item?.players) ? item.players.length : 0;
  const checkedIn = Array.isArray(item?.players) ? item.players.filter((player) => player.checkedInAt).length : 0;
  const lobbyCount = countNestedEntries(item?.lobbies || []);
  let score = 0;
  if (isCurrentActive) score += 12;
  if (tournament.startAt) score += 120;
  if (statusRank[status]) score += statusRank[status] * 20;
  score += Math.min(players, 256);
  score += Math.min(checkedIn, 256) * 2;
  score += Math.min(lobbyCount, 256) * 3;
  if (!tournament.startAt && status === "entry" && !lobbyCount) score -= 80;
  return score;
}

function countNestedEntries(value) {
  if (!Array.isArray(value)) return value ? 1 : 0;
  return value.reduce((sum, item) => sum + countNestedEntries(item), 0);
}

function normalizeTournamentSnapshot(snapshot) {
  if (!snapshot?.tournament) return;
  snapshot.tournament.status = automatedTournamentStatus(snapshot.tournament);
  if (["entry", "checkin"].includes(snapshot.tournament.status)) {
    delete snapshot.tournament.checkInFinalizedAt;
    (snapshot.players || []).forEach((player) => {
      if (player.checkedInAt) return;
      player.didNotCheckIn = false;
      player.isSubstitute = false;
    });
    snapshot.lobbies = [];
    snapshot.lobbyHosts = [];
    snapshot.results = {};
    snapshot.reports = [];
  }
}

function automatedTournamentStatus(tournament) {
  const current = tournament.status === "upcoming" ? "entry" : tournament.status || "entry";
  if (current === "live" || current === "finished") return current;
  if (!tournament.startAt) return current === "ready" ? "ready" : "entry";
  const start = parseJapanLocalDate(tournament.startAt);
  if (!Number.isFinite(start)) return current;
  const now = Date.now();
  const checkInOpen = start - 30 * 60 * 1000;
  if (now < checkInOpen) return "entry";
  if (now <= start) return "checkin";
  return "ready";
}

function parseJapanLocalDate(value) {
  if (!value) return Number.NaN;
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(value)) return new Date(value).getTime();
  return new Date(`${value}+09:00`).getTime();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
