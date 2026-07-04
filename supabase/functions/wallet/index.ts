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
  anon_id?: string;
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
  merged_balance?: number;
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

  const rawAnonId = (body as { anon_id?: unknown }).anon_id;
  const anonId = typeof rawAnonId === "string" ? rawAnonId.trim() : "";

  const mode = (body as { mode?: unknown }).mode;
  if (mode !== "peek" && mode !== "claim") {
    throw new Error("invalid_mode");
  }

  const tzOffset = Number((body as { tz_offset_minutes?: unknown }).tz_offset_minutes);
  if (!Number.isFinite(tzOffset) || tzOffset < -840 || tzOffset > 840) {
    throw new Error("invalid_tz_offset_minutes");
  }

  return {
    anon_id: anonId || undefined,
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
  const normalized: WalletPayload = {
    status: typeof source.status === "string" ? source.status : "claimed",
    tokens_awarded: toSafeInteger(source.tokens_awarded),
    new_balance: toSafeInteger(source.new_balance),
    window_day_count: windowDayCount,
    tier,
    days_to_goal: Math.max(0, 5 - windowDayCount),
    goals_completed: toSafeInteger(source.goals_completed),
    is_first_ever: Boolean(source.is_first_ever),
  };
  if (source.merged_balance !== undefined) {
    normalized.merged_balance = toSafeInteger(source.merged_balance);
  }
  return normalized;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
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

    const jwt = extractBearerToken(req);
    let userId: string | null = null;
    let mergedBalance: number | undefined;

    if (jwt) {
      const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
      if (userError || !userData?.user?.id) {
        return jsonResponse(401, { error: "invalid_token" });
      }
      userId = userData.user.id;

      if (parsedBody.anon_id) {
        const { data: anonWalletBefore } = await supabase
          .from("wallets")
          .select("anon_id, user_id, token_balance")
          .eq("anon_id", parsedBody.anon_id)
          .maybeSingle();

        const { data: userWalletBefore } = await supabase
          .from("wallets")
          .select("anon_id, user_id")
          .eq("user_id", userId)
          .maybeSingle();

        const hadSeparateAnonWallet = Boolean(
          anonWalletBefore &&
            (!anonWalletBefore.user_id || anonWalletBefore.user_id !== userId) &&
            (!userWalletBefore || userWalletBefore.anon_id !== parsedBody.anon_id),
        );
        const guestTokensMerged = hadSeparateAnonWallet
          ? toSafeInteger(anonWalletBefore?.token_balance)
          : 0;

        const { error: attachError } = await supabase.rpc("wallet_attach_user", {
          p_anon_id: parsedBody.anon_id,
          p_user_id: userId,
        });

        if (attachError) {
          return jsonResponse(500, { error: "database_error" });
        }

        if (hadSeparateAnonWallet && guestTokensMerged > 0) {
          mergedBalance = guestTokensMerged;
        }
      }
    }

    if (userId) {
      if (parsedBody.mode === "peek") {
        const { error: upsertError } = await supabase
          .from("wallets")
          .upsert(
            { anon_id: `user:${userId}`, user_id: userId },
            { onConflict: "user_id", ignoreDuplicates: true },
          );

        if (upsertError) {
          return jsonResponse(500, { error: "database_error" });
        }

        const { data: wallet, error: selectError } = await supabase
          .from("wallets")
          .select("token_balance, window_log_count, goals_completed, first_claim_at")
          .eq("user_id", userId)
          .single();

        if (selectError || !wallet) {
          return jsonResponse(500, { error: "database_error" });
        }

        const windowDayCount = Math.min(7, Math.max(0, toSafeInteger(wallet.window_log_count)));
        const payload = normalizeWalletPayload({
          status: "peek",
          tokens_awarded: 0,
          new_balance: wallet.token_balance,
          window_day_count: windowDayCount,
          tier: tierForWindowDay(windowDayCount),
          days_to_goal: Math.max(0, 5 - windowDayCount),
          goals_completed: wallet.goals_completed,
          is_first_ever: !wallet.first_claim_at,
        });
        if (mergedBalance !== undefined) {
          payload.merged_balance = mergedBalance;
        }
        return jsonResponse(200, payload);
      }

      const { data: claimData, error: claimError } = await supabase.rpc("wallet_claim_user", {
        p_user_id: userId,
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

      const payload = normalizeWalletPayload(rawPayload);
      if (mergedBalance !== undefined) {
        payload.merged_balance = mergedBalance;
      }
      return jsonResponse(200, payload);
    }

    if (!parsedBody.anon_id) {
      return jsonResponse(400, { error: "anon_id_required" });
    }

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
        error.message === "invalid_mode" ||
        error.message === "invalid_tz_offset_minutes"
      ) {
        return jsonResponse(400, { error: error.message });
      }
    }
    return jsonResponse(500, { error: "internal_error" });
  }
});
