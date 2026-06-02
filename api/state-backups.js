const REMOTE_STATE_ID = "tftrise-main";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const configuredPin = process.env.ADMIN_PIN || "";
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};

  if (!configuredPin || !supabaseUrl || !serviceRoleKey) {
    res.status(503).json({ ok: false, message: "サーバー設定が不足しています。" });
    return;
  }

  if (String(body.pin || "") !== configuredPin) {
    res.status(401).json({ ok: false, message: "管理PINが違います。" });
    return;
  }

  if (body.action === "list") {
    await listBackups({ res, supabaseUrl, serviceRoleKey });
    return;
  }

  if (body.action === "restore") {
    await restoreBackup({ body, res, supabaseUrl, serviceRoleKey });
    return;
  }

  res.status(400).json({ ok: false, message: "操作が正しくありません。" });
};

async function listBackups({ res, supabaseUrl, serviceRoleKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state_backups?state_id=eq.${REMOTE_STATE_ID}&select=id,state_id,reason,created_at&order=created_at.desc&limit=30`, {
    headers: apiHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    res.status(response.status).json({ ok: false, message: "バックアップ一覧を読み込めませんでした。" });
    return;
  }

  const rows = await response.json();
  res.status(200).json({ ok: true, backups: rows || [] });
}

async function restoreBackup({ body, res, supabaseUrl, serviceRoleKey }) {
  const backupId = Number(body.id);
  if (!Number.isFinite(backupId)) {
    res.status(400).json({ ok: false, message: "バックアップIDが正しくありません。" });
    return;
  }

  const backupResponse = await fetch(`${supabaseUrl}/rest/v1/app_state_backups?id=eq.${backupId}&state_id=eq.${REMOTE_STATE_ID}&select=data&limit=1`, {
    headers: apiHeaders(serviceRoleKey),
  });

  if (!backupResponse.ok) {
    res.status(backupResponse.status).json({ ok: false, message: "バックアップを読み込めませんでした。" });
    return;
  }

  const backups = await backupResponse.json();
  const backupData = backups?.[0]?.data;
  if (!backupData) {
    res.status(404).json({ ok: false, message: "バックアップが見つかりません。" });
    return;
  }

  await backupCurrentState({ supabaseUrl, serviceRoleKey, reason: "before-restore" });

  const restoreResponse = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey),
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: REMOTE_STATE_ID,
      data: backupData,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!restoreResponse.ok) {
    res.status(restoreResponse.status).json({ ok: false, message: "バックアップを復旧できませんでした。" });
    return;
  }

  res.status(200).json({ ok: true, data: backupData });
}

async function backupCurrentState({ supabaseUrl, serviceRoleKey, reason }) {
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
        reason,
      }),
    });
    return backupResponse.ok;
  } catch (_) {
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
