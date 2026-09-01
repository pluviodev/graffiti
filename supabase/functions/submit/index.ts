import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isCodeValid } from "./isCodeValid.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- Löschen (nur mit ADMIN_CODE) ---
    if (body.action === "delete") {
      if (!isCodeValid(body.code ?? "", Deno.env.get("ADMIN_CODE") ?? "")) {
        return json({ error: "Falscher Admin-Code" }, 403);
      }
      const { data: row } = await admin.from("entries").select("image_path").eq("id", body.id).single();
      if (row?.image_path) await admin.storage.from("artworks").remove([row.image_path]);
      const del = await admin.from("entries").delete().eq("id", body.id);   // votes hängen per ON DELETE CASCADE dran
      if (del.error) throw del.error;
      return json({ ok: true });
    }

    // --- Upload (nur mit UPLOAD_CODE) ---
    const { code, imageBase64, nickname, mode, motif, battleWeek, battleWord } = body;
    if (!isCodeValid(code ?? "", Deno.env.get("UPLOAD_CODE") ?? "")) {
      return json({ error: "Falscher Code" }, 403);
    }
    if (!imageBase64 || !["hall", "battle"].includes(mode)) {
      return json({ error: "Ungültige Daten" }, 400);
    }
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
    return json({ ok: true, path });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
