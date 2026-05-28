module.exports = function handler(req, res) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
  });
};
