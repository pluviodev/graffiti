import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isCodeValid } from "./isCodeValid.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { code, imageBase64, nickname, mode, motif, battleWeek, battleWord } = await req.json();
    if (!isCodeValid(code ?? "", Deno.env.get("UPLOAD_CODE") ?? "")) {
      return new Response(JSON.stringify({ error: "Falscher Code" }), { status: 403, headers: { ...CORS, "content-type": "application/json" } });
    }
    if (!imageBase64 || !["hall", "battle"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Ungültige Daten" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bytes = Uint8Array.from(atob(imageBase64.split(",").pop()), (c) => c.charCodeAt(0));
    const path = `${mode}/${crypto.randomUUID()}.png`;
    const up = await admin.storage.from("artworks").upload(path, bytes, { contentType: "image/png" });
    if (up.error) throw up.error;
    const ins = await admin.from("entries").insert({
      nickname: (nickname ?? "anonym").slice(0, 40),
      mode, motif: (motif ?? "").slice(0, 60),
      battle_week: mode === "battle" ? battleWeek : null,
      battle_word: mode === "battle" ? battleWord : null,
      image_path: path,
    });
    if (ins.error) throw ins.error;
    return new Response(JSON.stringify({ ok: true, path }), { headers: { ...CORS, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, "content-type": "application/json" } });
  }
});
