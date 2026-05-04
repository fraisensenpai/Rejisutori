// Tenka chat edge function — calls Google Gemini API directly
// Returns { speech, data: { actions, log } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Tenka, a highly intelligent and supportive AI life companion inside the Rejisutori app.
Your goal is to help users manage their habits, prayers, and daily tasks with precision and care.

Capabilities:
1. Interpret user requests and manage their schedule using the provided tools.
2. Provide concise, warm, and helpful natural language responses.
3. Maintain a consistent and kind personality.

Tools & Actions:
- create_task: Add new habits, prayers, or tasks.
- update_task: Modify an existing task (title, time, category, etc.). You MUST have the task ID.
- delete_task: Remove a task. You MUST have the task ID.
- complete_task: Mark a task as done for today.
- log: Record feelings, reflections, or notes.

Rules:
- ALWAYS use the "tenka_reply" tool for your response.
- When the user asks to change or remove something, look for the ID in the provided context.
- Keep speech brief (1-3 sentences), warm, and human.
- If you're unsure which task to update, ask for clarification instead of guessing.
- For reflections, emit a "log" action AND/OR the speech response.`;

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
                  type: { type: "string", enum: ["create_task", "update_task", "delete_task", "complete_task", "create_category", "log"] },
                  id: { type: "string", description: "The unique ID of the task or category to update/delete." },
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
              },
            },
            log: {
              type: "object",
              properties: {
                text: { type: "string" },
                mood: { type: "string", enum: ["great", "good", "ok", "low"] },
              },
            },
          },
          required: ["actions"],
        },
      },
      required: ["speech", "data"],
    },
  }],
};

// @ts-ignore: Deno is globally available in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // @ts-ignore: Deno is globally available in Supabase Edge Functions
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase Secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages = [], context = {} } = body;

    const ctxLine = `Context: today=${context.today}; categories=${(context.categories || [])
      .map((c: any) => c.name)
      .join(", ") || "(none)"}. 
      Tasks: ${JSON.stringify(context.tasks || [])}`;

    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${ctxLine}`;

    // Convert OpenAI messages to Gemini format and ensure alternating roles
    const contents: any[] = [];
    messages.forEach((m: any) => {
      const role = m.role === "assistant" ? "model" : "user";
      const last = contents[contents.length - 1];
      
      if (last && last.role === role) {
        last.parts[0].text += "\n" + m.content;
      } else {
        contents.push({
          role: role,
          parts: [{ text: m.content }],
        });
      }
    });

    // Gemini requires the first message to be from 'user'
    if (contents.length > 0 && contents[0].role === "model") {
      contents.unshift({ role: "user", parts: [{ text: "Hello" }] });
    }
    
    // If empty, add a dummy user message to satisfy API
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    // Using Gemini 1.5 Pro for advanced reasoning
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: fullSystemPrompt }] },
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

    const result = await res.json();

    if (!res.ok) {
      console.error("Gemini API error:", res.status, result);
      return new Response(JSON.stringify({ 
        error: "Gemini API error", 
        status: res.status,
        details: result 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidate = result?.candidates?.[0];
    
    if (candidate?.finishReason && candidate.finishReason !== "STOP" && !candidate.content) {
      console.error("Gemini Finish Reason:", candidate.finishReason);
      return new Response(JSON.stringify({ error: `AI finished with reason: ${candidate.finishReason}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
