// Sincroniza resultados de Liga MX desde la API de ESPN (misma fuente que las jornadas).
// Invocar: POST con body { temporada?, jornada? } (opcional; por defecto Clausura 2026, 11).
// Este archivo se ejecuta en Deno (Supabase Edge Functions); el IDE puede marcar errores.
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard";

// Partidos Jornada 11 (mismo orden que en App.jsx PARTIDOS_J11)
const PARTIDOS_J11: { id: number; local: string; visitante: string }[] = [
  { id: 1, local: "Puebla", visitante: "Necaxa" },
  { id: 2, local: "FC Juárez", visitante: "Monterrey" },
  { id: 3, local: "Atlético San Luis", visitante: "Pachuca" },
  { id: 4, local: "Guadalajara", visitante: "Santos Laguna" },
  { id: 5, local: "León", visitante: "Tijuana" },
  { id: 6, local: "Toluca", visitante: "Atlas" },
  { id: 7, local: "Pumas UNAM", visitante: "Cruz Azul" },
  { id: 8, local: "Tigres UANL", visitante: "Querétaro" },
  { id: 9, local: "América", visitante: "Mazatlán" },
];

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

const ALIASES: Record<string, string> = {
  "santos": "santos laguna",
  "atletico de san luis": "atletico san luis",
  "fc juarez": "fc juarez",
  "juarez": "fc juarez",
  "club america": "america",
  "mazatlan fc": "mazatlan",
  "mazatlan": "mazatlan",
  "pumas": "pumas unam",
  "tigres": "tigres uanl",
  "club tijuana": "tijuana",
  "xolos": "tijuana",
  "gallos blancos": "queretaro",
};

function toOurName(espnName: string): string {
  const n = normalize(espnName);
  return ALIASES[n] ?? n;
}

function findPartidoId(homeName: string, awayName: string): number | null {
  const h = normalize(toOurName(homeName));
  const a = normalize(toOurName(awayName));
  for (const p of PARTIDOS_J11) {
    if (normalize(p.local) === h && normalize(p.visitante) === a) return p.id;
  }
  return null;
}

function scoreToResult(homeScore: number, awayScore: number): "1" | "X" | "2" {
  if (homeScore > awayScore) return "1";
  if (awayScore > homeScore) return "2";
  return "X";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const temporada = body.temporada ?? "Clausura 2026";
    const jornada = body.jornada ?? 11;

    const partidos = jornada === 11 ? PARTIDOS_J11 : [];
    if (partidos.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Solo jornada 11 configurada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rango ampliado por si ESPN agrupa partidos en días adyacentes (UTC / zona)
    const dates = ["20260312", "20260313", "20260314", "20260315", "20260316"];
    const seen = new Set<string>();
    const allEvents: { home: string; away: string; homeScore: number; awayScore: number }[] = [];

    for (const date of dates) {
      const res = await fetch(`${ESPN_SCOREBOARD}?dates=${date}`);
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events ?? [];
      for (const ev of events) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.state;
        if (status !== "post") continue;
        const home = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
        const away = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");
        if (!home?.team?.displayName || !away?.team?.displayName) continue;
        const key = `${home.team.displayName}|${away.team.displayName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const homeScore = parseInt(home.score ?? "0", 10);
        const awayScore = parseInt(away.score ?? "0", 10);
        allEvents.push({
          home: home.team.displayName,
          away: away.team.displayName,
          homeScore,
          awayScore,
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rows: { temporada: string; jornada: number; partido_id: number; resultado: string; goles_local: number; goles_visitante: number }[] = [];
    for (const ev of allEvents) {
      const partidoId = findPartidoId(ev.home, ev.away);
      if (partidoId == null) continue;
      rows.push({
        temporada,
        jornada,
        partido_id: partidoId,
        resultado: scoreToResult(ev.homeScore, ev.awayScore),
        goles_local: ev.homeScore,
        goles_visitante: ev.awayScore,
      });
    }

    if (rows.length) {
      const { error } = await supabase.from("resultados").upsert(rows, {
        onConflict: "temporada,jornada,partido_id",
      });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, updated: rows.length, rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
