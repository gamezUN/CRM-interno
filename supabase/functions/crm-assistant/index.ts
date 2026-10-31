import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Supabase function environment is incomplete" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
      return json({ error: "Invalid conversation" }, 400);
    }

    const safeMessages = messages.map((m: any) => {
      if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
        throw new Error("Invalid message format");
      }
      if (m.content.length > 2000) throw new Error("Message is too long");
      return { role: m.role, content: m.content };
    });
    if (safeMessages[safeMessages.length - 1].role !== "user") {
      return json({ error: "A user question is required" }, 400);
    }

    // RLS is enforced with the authenticated user's JWT. The explicit user_id
    // filter adds a second ownership boundary.
    const { data: rows, error: queryError } = await supabase
      .from("crm_projects")
      .select("data")
      .eq("user_id", userData.user.id);
    if (queryError) return json({ error: "Could not read CRM records" }, 500);

    // Send only fields needed for business summaries. Contact details,
    // phone numbers, email addresses, notes and payment references are excluded.
    const projects = (rows || []).map((row: any) => {
      const p = row.data || {};
      const payments = Array.isArray(p.pagos) ? p.pagos : [];
      const paid = payments.reduce((sum: number, payment: any) => sum + Number(payment?.monto || 0), 0);
      const amount = Number(p.importe || 0);
      return {
        number: p.num,
        client: String(p.cliente || "").slice(0, 100),
        project: String(p.proyecto || "").slice(0, 140),
        sale_status: p.venta || "",
        development_status: p.desarrollo || "",
        amount,
        paid,
        balance: p.venta === "Ganado" ? Math.max(0, amount - paid) : 0,
        deadline: p.limite || null,
        follow_up: p.seguimiento || null,
        next_action: String(p.accion || "").slice(0, 180),
        payment_dates: payments.map((x: any) => ({ date: x.fecha || null, amount: Number(x.monto || 0) })),
      };
    });

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "La conexión con IA aún no está activada. Falta configurar OPENAI_API_KEY." }, 503);

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
    const system = `Eres el asistente interno de Gámez Desarrollo Web. Responde en español claro, directo y práctico.
Usa exclusivamente los datos del CRM incluidos abajo y la conversación. Si falta información, dilo; nunca inventes cifras, fechas, clientes ni estados.
Distingue ventas ganadas de prospectos; el saldo solo corresponde a proyectos Ganados.
No solicites contraseñas, datos bancarios ni información sensible. Eres de solo lectura: no afirmes que creaste, editaste, enviaste o eliminaste nada.
Indica cuando una cifra sea un cálculo y explica brevemente cómo la obtuviste.
Datos del CRM (JSON): ${JSON.stringify(projects)}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 700,
        input: [
          { role: "system", content: system },
          ...safeMessages,
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI API error", response.status, detail.slice(0, 500));
      return json({ error: "El proveedor de IA no pudo procesar la consulta." }, 502);
    }

    const result = await response.json();
    const answer = (result.output || [])
      .flatMap((item: any) => item.content || [])
      .filter((item: any) => item.type === "output_text")
      .map((item: any) => item.text)
      .join("\n")
      .trim();

    if (!answer) return json({ error: "La IA devolvió una respuesta vacía." }, 502);
    return json({ answer });
  } catch (error) {
    console.error("crm-assistant error", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});
