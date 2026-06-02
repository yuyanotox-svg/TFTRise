module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const configuredPin = process.env.ADMIN_PIN || "";
  if (!configuredPin) {
    res.status(503).json({ ok: false, message: "管理PINがサーバーに設定されていません。" });
    return;
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const pin = String(body.pin || "");

  if (pin !== configuredPin) {
    res.status(401).json({ ok: false, message: "管理PINが違います。" });
    return;
  }

  res.status(200).json({ ok: true });
};

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (_) {
    return {};
  }
}
