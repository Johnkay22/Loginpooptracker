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

interface WalletPayload {
  status: string;
  tokens_awarded: number;
  new_balance: number;
  window_day_count: number;
  tier: "normal" | "goal" | "overtime" | "perfect";
  days_to_goal: number;
  goals_completed: number;
  is_first_ever: boolean;
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

function toSafeInteger(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function tierForWindowDay(dayCount: number): WalletPayload["tier"] {
  if (dayCount >= 7) return "perfect";
  if (dayCount === 6) return "overtime";
  if (dayCount === 5) return "goal";
  return "normal";
}

function normalizeWalletPayload(payload: unknown): WalletPayload {
  const source = (payload && typeof payload === "object") ? payload as Record<string, unknown> : {};
  const windowDayCount = Math.min(7, Math.max(0, toSafeInteger(source.window_day_count)));
  const tier = tierForWindowDay(windowDayCount);
  return {
    status: typeof source.status === "string" ? source.status : "claimed",
    tokens_awarded: toSafeInteger(source.tokens_awarded),
    new_balance: toSafeInteger(source.new_balance),
    window_day_count: windowDayCount,
    tier,
    days_to_goal: Math.max(0, 5 - windowDayCount),
    goals_completed: toSafeInteger(source.goals_completed),
    is_first_ever: Boolean(source.is_first_ever),
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
        .select("token_balance, window_log_count, goals_completed, first_claim_at")
        .eq("anon_id", parsedBody.anon_id)
        .single();

      if (selectError || !wallet) {
        return jsonResponse(500, { error: "database_error" });
      }

      const windowDayCount = Math.min(7, Math.max(0, toSafeInteger(wallet.window_log_count)));
      return jsonResponse(200, normalizeWalletPayload({
        status: "peek",
        tokens_awarded: 0,
        new_balance: wallet.token_balance,
        window_day_count: windowDayCount,
        tier: tierForWindowDay(windowDayCount),
        days_to_goal: Math.max(0, 5 - windowDayCount),
        goals_completed: wallet.goals_completed,
        is_first_ever: !wallet.first_claim_at,
      }));
    }

    const { data: claimData, error: claimError } = await supabase.rpc("wallet_claim", {
      p_anon_id: parsedBody.anon_id,
      p_tz_offset_minutes: parsedBody.tz_offset_minutes,
      p_normal_reward: NORMAL_REWARD,
      p_day5_reward: DAY5_REWARD,
      p_day7_reward: DAY7_REWARD,
      p_min_hours_between_claims: MIN_HOURS_BETWEEN_CLAIMS,
    });

    if (claimError) {
      return jsonResponse(500, { error: "database_error" });
    }

    const rawPayload = Array.isArray(claimData) ? claimData[0] : claimData;
    if (!rawPayload || typeof rawPayload !== "object") {
      return jsonResponse(500, { error: "database_error" });
    }

    return jsonResponse(200, normalizeWalletPayload(rawPayload));
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
