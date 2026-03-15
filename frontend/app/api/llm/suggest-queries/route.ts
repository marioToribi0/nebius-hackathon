import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NEBIUS_API_KEY not configured" },
      { status: 500 },
    );
  }

  const resp = await fetch(
    "https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b",
        messages: [
          {
            role: "system",
            content:
              'You are a travel image search assistant. Given a user\'s travel query, generate exactly 3 specific image search queries that would return beautiful, relevant photos. Return ONLY a JSON array of 3 strings, no other text. Example: ["sunset over Santorini caldera", "turquoise water Bali rice terraces", "cherry blossom Tokyo temple"]',
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: `LLM request failed: ${text}` },
      { status: 502 },
    );
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "[]";

  try {
    const queries = JSON.parse(content);
    if (Array.isArray(queries)) {
      return NextResponse.json({ queries: queries.slice(0, 3) });
    }
  } catch {
    // Try extracting JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const queries = JSON.parse(match[0]);
        return NextResponse.json({ queries: queries.slice(0, 3) });
      } catch {
        // fall through
      }
    }
  }

  return NextResponse.json({ queries: [prompt] });
}
