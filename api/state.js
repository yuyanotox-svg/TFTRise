const REMOTE_STATE_ID = "tftrise-main";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(503).json({ ok: false, message: "Supabaseのサーバー設定が不足しています。" });
    return;
  }

  if (req.method === "GET") {
    await readState({ res, supabaseUrl, serviceRoleKey });
    return;
  }

  if (req.method === "POST") {
    await writeState({ req, res, supabaseUrl, serviceRoleKey });
    return;
  }

  res.status(405).json({ ok: false, message: "Method not allowed" });
};

async function readState({ res, supabaseUrl, serviceRoleKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${REMOTE_STATE_ID}&select=data`, {
    headers: apiHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    res.status(response.status).json({ ok: false, message: "共有データを読み込めませんでした。" });
    return;
  }

  const rows = await response.json();
  res.status(200).json({ ok: true, data: rows?.[0]?.data || null });
}

async function writeState({ req, res, supabaseUrl, serviceRoleKey }) {
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  if (!body || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ ok: false, message: "保存データの形式が正しくありません。" });
    return;
  }

  const backupOk = await backupCurrentState({ supabaseUrl, serviceRoleKey });

  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey),
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

  res.status(200).json({ ok: true, backupOk });
}

async function backupCurrentState({ supabaseUrl, serviceRoleKey }) {
  try {
    const currentResponse = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${REMOTE_STATE_ID}&select=data`, {
      headers: apiHeaders(serviceRoleKey),
    });
    if (!currentResponse.ok) return false;
    const rows = await currentResponse.json();
    const currentData = rows?.[0]?.data;
    if (!currentData) return true;

    const backupResponse = await fetch(`${supabaseUrl}/rest/v1/app_state_backups`, {
      method: "POST",
      headers: apiHeaders(serviceRoleKey),
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

function apiHeaders(serviceRoleKey) {
  return {
    "Content-Type": "application/json",
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
  };
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (_) {
    return {};
  }
}
