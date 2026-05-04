// Tenka chat edge function — calls Google Gemini API directly
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
  function_declarations: [{
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
  }],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { messages = [], context = {} } = await req.json();

    const ctxLine = `Context: today=${context.today}; categories=${(context.categories || [])
      .map((c: any) => c.name)
      .join(", ") || "(none)"}.`;

    // Convert OpenAI messages to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Insert context as the first user message
    contents.unshift({
      role: "user",
      parts: [{ text: ctxLine }],
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: contents,
        tools: [tool],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["tenka_reply"]
          }
        }
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gemini API error", res.status, text);
      return new Response(JSON.stringify({ error: "Gemini API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await res.json();
    const candidate = result?.candidates?.[0];
    const call = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    
    let parsed: any = { speech: "Okay.", data: { actions: [], log: null } };
    
    if (call?.args) {
      parsed = call.args;
    } else if (candidate?.content?.parts?.[0]?.text) {
      parsed.speech = candidate.content.parts[0].text;
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
