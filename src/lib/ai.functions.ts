import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";

async function streamResponses(body: Record<string, unknown>): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: MODEL, stream: true, store: false, reasoning: { effort: "low" }, ...body }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Rate limited — please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace settings.");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const f of frames) {
      for (const line of f.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const j = JSON.parse(d);
          if (j.type === "response.output_text.delta") out += j.delta;
          if (j.type === "response.refusal.delta") throw new Error("The AI declined this request.");
          if (j.type === "error" || j.type === "response.failed") throw new Error(j.error?.message || j.response?.error?.message || "AI failed");
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  return out;
}

const signalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["signal", "confidence", "pair", "patterns", "reasoning_en", "reasoning_bn", "entry_tip_en", "entry_tip_bn", "risk"],
  properties: {
    signal: { type: "string", enum: ["CALL", "PUT", "WAIT"] },
    confidence: { type: "number" },
    pair: { type: "string" },
    patterns: { type: "array", items: { type: "string" } },
    reasoning_en: { type: "string" },
    reasoning_bn: { type: "string" },
    entry_tip_en: { type: "string" },
    entry_tip_bn: { type: "string" },
    risk: { type: "string", enum: ["low", "medium", "high"] },
  },
};

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
  .inputValidator(z.object({ image: z.string().startsWith("data:image/").max(8_000_000) }))
  .handler(async ({ data }) => {
    const text = await streamResponses({
      instructions:
        "You are an expert Quotex 1-minute binary options price-action analyst. Analyze the screenshot of a 1m candlestick chart. Focus on the last 5-10 candles: pin bar rejections, engulfing, strong wicks, support/resistance breakouts or rejections. Predict the NEXT 1-minute candle direction: CALL, PUT, or WAIT if choppy/unclear/not a chart. Confidence 0-100, be honest and conservative (rarely above 80). Identify the pair if visible, else 'Unknown'. Give concise reasoning and an entry timing tip (e.g. enter at the candle open, at 58-60s of the current candle) in both English and Bangla (বাংলা).",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this Quotex 1m chart and give the next-candle signal." },
            { type: "input_image", image_url: data.image },
          ],
        },
      ],
      text: { format: { type: "json_schema", name: "signal", strict: true, schema: signalSchema } },
    });
    return JSON.parse(text) as ChartSignal;
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
  .handler(async ({ data }) => {
    const text = await streamResponses({
      instructions:
        "You are a strict but supportive trading psychology coach for Quotex 1-minute binary options traders. Analyze the trade log (timestamps, amounts, results). Detect over-trading (too many trades in short time), revenge trading (raising stake right after losses), martingale abuse, and emotional patterns. Give a short summary and 3-5 actionable tips, in English and Bangla (বাংলা).",
      input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(data.trades) }] }],
      text: { format: { type: "json_schema", name: "coach", strict: true, schema: coachSchema } },
    });
    return JSON.parse(text) as CoachResult;
  });
