"use strict";

exports.handler = async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed. Use GET." });
  }

  const baseUrl = process.env.OPENCLAW_BASE_URL;
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_PASSWORD;
  const agentId = process.env.OPENCLAW_AGENT_ID || "main";
  const model = process.env.OPENCLAW_MODEL || "openclaw";

  if (!baseUrl || !token) {
    return jsonResponse(503, {
      error: "OpenClaw is not configured yet. Set OPENCLAW_BASE_URL and OPENCLAW_GATEWAY_TOKEN in Netlify before using News."
    });
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  const minPrice = toPositiveNumber(params.get("minPrice"), 5);
  const minVolume = Math.floor(toPositiveNumber(params.get("minVolume"), 1000000));

  const instructions = [
    "You are an equity news analyst assembling a candidate-buy watchlist.",
    "Return JSON only with this exact shape:",
    '{"items":[{"symbol":"","company":"","headline":"","summary":"","whyItMatters":"","sourceName":"","sourceUrl":"","publishedAt":"","price":0,"averageDailyVolume":0,"market":"US","candidateScore":""}]}',
    "Rules:",
    "- Only include U.S.-listed stocks.",
    "- Only include liquid names.",
    `- Only include stocks with price strictly above ${minPrice}.`,
    `- Only include stocks with average daily volume at or above ${minVolume}.`,
    "- Focus on the latest news that could make the stock interesting to buy.",
    "- Include at most 8 items.",
    "- Use concise, factual summaries.",
    "- Omit any item that does not meet the filters."
  ].join("\n");

  try {
    const response = await fetch(new URL("/v1/responses", ensureTrailingSlash(baseUrl)), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "x-openclaw-agent-id": agentId
      },
      body: JSON.stringify({
        model,
        input: "Pull the latest candidate stock news now.",
        instructions,
        max_output_tokens: 1400
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message
        ? payload.error.message
        : "OpenClaw request failed.";
      return jsonResponse(response.status, { error: message });
    }

    const outputText = extractOutputText(payload);
    const parsed = parseNewsPayload(outputText);

    return jsonResponse(200, {
      generatedAt: new Date().toISOString(),
      items: normalizeItems(parsed.items)
    });
  } catch (error) {
    return jsonResponse(502, {
      error: error && error.message
        ? error.message
        : "Unable to reach the OpenClaw gateway."
    });
  }
};

function parseNewsPayload(text) {
  if (!text) {
    return { items: [] };
  }

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return parsed && typeof parsed === "object" ? parsed : { items: [] };
}

function extractOutputText(payload) {
  if (payload && typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!payload || !Array.isArray(payload.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((part) => {
      if (typeof part.text === "string") {
        return part.text;
      }

      if (typeof part.output_text === "string") {
        return part.output_text;
      }

      return "";
    })
    .join("")
    .trim();
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    symbol: asString(item.symbol),
    company: asString(item.company),
    headline: asString(item.headline),
    summary: asString(item.summary),
    whyItMatters: asString(item.whyItMatters),
    sourceName: asString(item.sourceName),
    sourceUrl: asString(item.sourceUrl),
    publishedAt: asString(item.publishedAt),
    price: toPositiveNumber(item.price, 0),
    averageDailyVolume: Math.floor(toPositiveNumber(item.averageDailyVolume, 0)),
    market: asString(item.market) || "US",
    candidateScore: asString(item.candidateScore)
  }));
}

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}
