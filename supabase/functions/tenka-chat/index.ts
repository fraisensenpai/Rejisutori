// Tenka chat edge function — calls Lovable AI Gateway
// Returns { speech, data: { actions, log } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Tenka, a warm, concise AI life companion inside the Rejisutori app.
You help users plan habits, prayers, tasks, and reflect on their day.
Always reply via the "tenka_reply" tool with:
- speech: a short, friendly natural-language reply (1-3 sentences max).
- data.actions: an array of structured actions to apply (may be empty).
- data.log: optional daily reflection log entry, or null.

Action types:
- create_task: { type, title, categoryName?, time? "HH:MM", date? "YYYY-MM-DD", days? [0-6 Sun-Sat], taskType? "habit"|"prayer"|"task" }
- create_category: { type, name, color? "H S% L%" hsl triplet }
- complete_task: { type, title }
- log: { type, text, mood? "great"|"good"|"ok"|"low" }

Rules:
- If the user asks to add/track a habit, prayer, or task, emit create_task.
- If they say "I did X" or "completed X", emit complete_task.
- For reflections/feelings, emit a log action AND/OR data.log.
- Keep speech kind, brief, and human. No markdown, no emoji-heavy spam.
- Never invent fields outside the schema.`;

const tool = {
  type: "function",
  function: {
    name: "tenka_reply",
    description: "Reply to the user with speech and structured actions.",
    parameters: {
      type: "object",
      properties: {
        speech: { type: "string" },
        data: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["create_task", "create_category", "complete_task", "log"] },
                  title: { type: "string" },
                  name: { type: "string" },
                  text: { type: "string" },
                  categoryName: { type: "string" },
                  color: { type: "string" },
                  time: { type: "string" },
                  date: { type: "string" },
                  days: { type: "array", items: { type: "number" } },
                  taskType: { type: "string", enum: ["habit", "prayer", "task"] },
                  mood: { type: "string", enum: ["great", "good", "ok", "low"] },
                },
                required: ["type"],
                additionalProperties: false,
              },
            },
            log: {
              type: ["object", "null"],
              properties: {
                text: { type: "string" },
                mood: { type: "string", enum: ["great", "good", "ok", "low"] },
              },
            },
          },
          required: ["actions"],
          additionalProperties: false,
        },
      },
      required: ["speech", "data"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages = [], context = {} } = await req.json();

    const ctxLine = `Context: today=${context.today}; categories=${(context.categories || [])
      .map((c: any) => c.name)
      .join(", ") || "(none)"}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: ctxLine },
          ...messages,
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "tenka_reply" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { speech: "Okay.", data: { actions: [], log: null } };
    if (call?.function?.arguments) {
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch (e) {
        console.error("Failed parsing tool args", e);
      }
    } else if (data?.choices?.[0]?.message?.content) {
      parsed.speech = data.choices[0].message.content;
    }

    if (!parsed.data) parsed.data = { actions: [], log: null };
    if (!Array.isArray(parsed.data.actions)) parsed.data.actions = [];

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tenka-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
