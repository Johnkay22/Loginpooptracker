import { createClient } from "npm:@supabase/supabase-js@2";

const NORMAL_REWARD = 1;
const DAY5_REWARD = 2;
const DAY7_REWARD = 5;
const MIN_HOURS_BETWEEN_CLAIMS = 20;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type WalletMode = "peek" | "claim";

interface WalletRequestBody {
  anon_id: string;
  mode: WalletMode;
  tz_offset_minutes: number;
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function validateInput(body: unknown): WalletRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("invalid_request_body");
  }

  const anonId = typeof (body as { anon_id?: unknown }).anon_id === "string"
    ? (body as { anon_id: string }).anon_id.trim()
    : "";
  if (!anonId) {
    throw new Error("anon_id_required");
  }

  const mode = (body as { mode?: unknown }).mode;
  if (mode !== "peek" && mode !== "claim") {
    throw new Error("invalid_mode");
  }

  const tzOffset = Number((body as { tz_offset_minutes?: unknown }).tz_offset_minutes);
  if (!Number.isFinite(tzOffset) || tzOffset < -840 || tzOffset > 840) {
    throw new Error("invalid_tz_offset_minutes");
  }

  return {
    anon_id: anonId,
    mode,
    tz_offset_minutes: tzOffset,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "server_not_configured" });
    }

    const parsedBody = validateInput(await req.json());

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (parsedBody.mode === "peek") {
      const { error: upsertError } = await supabase
        .from("wallets")
        .upsert({ anon_id: parsedBody.anon_id }, { onConflict: "anon_id", ignoreDuplicates: true });

      if (upsertError) {
        return jsonResponse(500, { error: "database_error" });
      }

      const { data: wallet, error: selectError } = await supabase
        .from("wallets")
        .select("token_balance, current_streak, longest_streak, total_earned, last_claim_date, last_claim_at")
        .eq("anon_id", parsedBody.anon_id)
        .single();

      if (selectError || !wallet) {
        return jsonResponse(500, { error: "database_error" });
      }

      return jsonResponse(200, {
        token_balance: wallet.token_balance,
        current_streak: wallet.current_streak,
        longest_streak: wallet.longest_streak,
        total_earned: wallet.total_earned,
        last_claim_date: wallet.last_claim_date,
        last_claim_at: wallet.last_claim_at,
        awarded: 0,
      });
    }

    const { data: claimRows, error: claimError } = await supabase.rpc("wallet_claim", {
      p_anon_id: parsedBody.anon_id,
      p_tz_offset_minutes: parsedBody.tz_offset_minutes,
      p_normal_reward: NORMAL_REWARD,
      p_day5_reward: DAY5_REWARD,
      p_day7_reward: DAY7_REWARD,
      p_min_hours_between_claims: MIN_HOURS_BETWEEN_CLAIMS,
    });

    if (claimError || !Array.isArray(claimRows) || claimRows.length === 0) {
      return jsonResponse(500, { error: "database_error" });
    }

    const claimed = claimRows[0];
    return jsonResponse(200, {
      token_balance: claimed.token_balance,
      current_streak: claimed.current_streak,
      longest_streak: claimed.longest_streak,
      total_earned: claimed.total_earned,
      last_claim_date: claimed.last_claim_date,
      last_claim_at: claimed.last_claim_at,
      awarded: claimed.awarded,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "invalid_request_body" ||
        error.message === "anon_id_required" ||
        error.message === "invalid_mode" ||
        error.message === "invalid_tz_offset_minutes"
      ) {
        return jsonResponse(400, { error: error.message });
      }
    }
    return jsonResponse(500, { error: "internal_error" });
  }
});
