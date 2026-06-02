module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const checks = [
    checkEnv("ADMIN_PIN", process.env.ADMIN_PIN),
    checkEnv("VITE_SUPABASE_URL", supabaseUrl),
    checkEnv("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey),
  ];

  if (supabaseUrl && serviceRoleKey) {
    checks.push(await checkTable({ supabaseUrl, serviceRoleKey, table: "app_state" }));
    checks.push(await checkTable({ supabaseUrl, serviceRoleKey, table: "app_state_backups" }));
  } else {
    checks.push({ key: "supabase_connection", ok: false, label: "Supabase接続", detail: "URLまたはService Role Keyが未設定です。" });
  }

  res.status(200).json({
    ok: checks.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    checks,
  });
};

function checkEnv(key, value) {
  return {
    key,
    ok: Boolean(value),
    label: key,
    detail: value ? "設定済み" : "未設定",
  };
}

async function checkTable({ supabaseUrl, serviceRoleKey, table }) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });
    return {
      key: table,
      ok: response.ok,
      label: table,
      detail: response.ok ? "接続OK" : `接続エラー ${response.status}`,
    };
  } catch (_) {
    return {
      key: table,
      ok: false,
      label: table,
      detail: "接続エラー",
    };
  }
}
