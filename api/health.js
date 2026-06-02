module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  const stateKey = serviceRoleKey || anonKey;

  const checks = [
    checkEnv("ADMIN_PIN", process.env.ADMIN_PIN, "未設定の場合はフォールバックPINを使用"),
    checkEnv("VITE_SUPABASE_URL", supabaseUrl),
    checkEnv("VITE_SUPABASE_ANON_KEY", anonKey),
    checkEnv("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey, "未設定の場合はバックアップ作成なしでAnon Keyを使用"),
  ];

  if (supabaseUrl && stateKey) {
    checks.push(await checkTable({ supabaseUrl, supabaseKey: stateKey, table: "app_state" }));
    if (serviceRoleKey) {
      checks.push(await checkTable({ supabaseUrl, supabaseKey: serviceRoleKey, table: "app_state_backups" }));
    }
  } else {
    checks.push({
      key: "supabase_connection",
      ok: false,
      label: "Supabase接続",
      detail: "URLまたはSupabase Keyが未設定です。",
    });
  }

  res.status(200).json({
    ok: checks.filter((item) => item.required !== false).every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    checks,
  });
};

function checkEnv(key, value, note = "") {
  const optional = key === "ADMIN_PIN" || key === "SUPABASE_SERVICE_ROLE_KEY";
  return {
    key,
    ok: Boolean(value) || optional,
    required: !optional,
    label: key,
    detail: value ? "設定済み" : (note || "未設定"),
  };
}

async function checkTable({ supabaseUrl, supabaseKey, table }) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
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
