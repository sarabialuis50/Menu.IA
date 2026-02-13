
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS (Gotcha #6)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // --- GOTCHA #1: Manejo de formato Twilio (form-urlencoded) ---
    const contentType = req.headers.get("content-type") || "";
    let payload: any = {};

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      // Twilio usa nombres de campos específicos (From, Body)
      payload = {
        from: params.get("From") || "",
        body: params.get("Body") || "",
      };
    }

    // --- GOTCHA #2: Normalización de teléfono ---
    // Twilio envía "whatsapp:+573123456789", nosotros solo queremos el número
    const rawPhone = payload.from || "";
    const cleanPhone = rawPhone.replace("whatsapp:", "").trim();

    if (!cleanPhone || !payload.body) {
      return new Response(JSON.stringify({ error: "Missing data" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Mensaje recibido de ${cleanPhone}: ${payload.body}`);

    // LOGICA TEMPORAL (Eco):
    // Aquí es donde en la Fase 2 llamaremos a OpenAI.
    // Por ahora, registramos la interacción y respondemos un eco básico.

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>¡Hola! Recibí tu mensaje: "${payload.body}". Pronto estaré listo para tomar tu pedido. 🤖</Message>
      </Response>`,
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/xml" } 
      }
    );

  } catch (error) {
    console.error("Error en Webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
})
