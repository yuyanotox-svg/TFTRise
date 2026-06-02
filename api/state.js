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
  res.status(200).json({ ok: true, data: rows?.[0]?.data || null });
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
      data: body.data,
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
