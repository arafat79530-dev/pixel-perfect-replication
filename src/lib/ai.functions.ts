import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export type ChartSignal = {
  signal: "CALL" | "PUT" | "WAIT";
  confidence: number;
  pair: string;
  patterns: string[];
  reasoning_en: string;
  reasoning_bn: string;
  entry_tip_en: string;
  entry_tip_bn: string;
  risk: "low" | "medium" | "high";
};

export const analyzeChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ image: z.string().startsWith("data:image/").max(8_000_000) }))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc('can_use_app');
    if (error || !allowed) throw new Error('Owner approval is required to analyze charts.');
    const { analyzeImage } = await import('./chart-ai.server');
    return analyzeImage(data.image);
  });

const coachSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary_en", "summary_bn", "issues", "tips_en", "tips_bn"],
  properties: {
    summary_en: { type: "string" },
    summary_bn: { type: "string" },
    issues: { type: "array", items: { type: "string", enum: ["overtrading", "revenge_trading", "martingale_abuse", "emotional", "none"] } },
    tips_en: { type: "array", items: { type: "string" } },
    tips_bn: { type: "array", items: { type: "string" } },
  },
};

export type CoachResult = {
  summary_en: string;
  summary_bn: string;
  issues: string[];
  tips_en: string[];
  tips_bn: string[];
};

export const coachTrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      trades: z
        .array(
          z.object({
            time: z.string(),
            pair: z.string(),
            dir: z.string(),
            amount: z.number(),
            payout: z.number(),
            result: z.string(),
            note: z.string().optional(),
          }),
        )
        .max(300),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc('can_use_app');
    if (error || !allowed) throw new Error('Owner approval is required to use the coach.');
    const { streamResponses } = await import("./chart-ai.server");
    const text = await streamResponses({
      instructions:
        "You are a strict but supportive trading psychology coach for Quotex 1-minute binary options traders. Analyze the trade log (timestamps, amounts, results). Detect over-trading (too many trades in short time), revenge trading (raising stake right after losses), martingale abuse, and emotional patterns. Give a short summary and 3-5 actionable tips, in English and Bangla (বাংলা).",
      input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(data.trades) }] }],
      text: { format: { type: "json_schema", name: "coach", strict: true, schema: coachSchema } },
    });
    return JSON.parse(text) as CoachResult;
  });
