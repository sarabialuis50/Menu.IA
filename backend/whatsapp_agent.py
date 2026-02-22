import os
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timezone
from openai import OpenAI
from twilio.rest import Client
from supabase import create_client, Client as SupabaseClient
from ai_base import get_shared_instructions, get_fallback_message

# Configuración de logging
logging.basicConfig(
    filename='agent.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize OpenAI
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Initialize Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role Key for backend ops
supabase: SupabaseClient = create_client(supabase_url, supabase_key)

# Initialize Twilio (Global Fallback)
GLOBAL_TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
GLOBAL_TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
GLOBAL_TWILIO_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER")

def get_twilio_client(sid: str = None, token: str = None):
    """Returns a Twilio client using provided credentials or global defaults"""
    return Client(sid or GLOBAL_TWILIO_SID, token or GLOBAL_TWILIO_AUTH_TOKEN)

SYSTEM_PROMPT = """
Eres Menu.IA Bot, el asistente virtual del restaurante. Tu objetivo es ayudar a los clientes a realizar pedidos de manera eficiente y amigable.

TU SITUACIÓN ACTUAL:
- Eres un asistente de IA conectado a la base de datos del restaurante.
- Debes usar las funciones disponibles para consultar el menú, buscar platos y crear pedidos.
- NUNCA inventes información sobre el menú o precios. Si no sabes algo, usa una función para averiguarlo.
- Sé conciso y directo, apropiado para WhatsApp.
- Si el cliente quiere "ver el menú", muestra las categorías principales primero o pregunta qué tipo de comida busca.

REGLAS DE INTERACCIÓN:
1. Saluda amablemente si es el inicio de la conversación.
2. Identifica la intención del usuario (ver menú, pedir plato, consultar estado, etc.).
3. Pide aclaraciones si la solicitud es ambigua (ej: "¿Qué tamaño de pizza?").
4. CONFIRMA siempre el pedido con el cliente antes de finalizarlo (items, total, dirección).
5. Solicita la dirección si es domicilio y no la tienes.
6. Solicita el nombre del cliente si no lo tienes.

FUNCIONES DISPONIBLES:
- get_menu_categories(): Obtiene las categorías del menú.
- get_products_by_category(category): Obtiene productos de una categoría.
- search_products(query): Busca productos por nombre.
- get_product_details(product_id): Obtiene detalles de un producto específico.
- create_order(order_details): Crea un nuevo pedido.
- get_order_status(order_id): Consulta el estado de un pedido.
- register_customer(nombre, email, telefono, fecha_nacimiento): Registra a un cliente.

HOY ES: {current_date}
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_menu_categories",
            "description": "Obtiene las categorías principales del menú del restaurante",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_products_by_category",
            "description": "Obtiene la lista de productos de una categoría específica",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "El nombre de la categoría (ej: 'Bebidas', 'Platos fuertes')"
                    }
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Busca productos en el menú por nombre o descripción",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Término de búsqueda (ej: 'hamburguesa', 'coca cola')"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "register_customer",
            "description": "Registra a un nuevo cliente en el programa de fidelización del negocio para que pueda acumular puntos y recibir beneficios.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": "Nombre completo del cliente"
                    },
                    "email": {
                        "type": "string",
                        "description": "Correo electrónico del cliente"
                    },
                    "telefono": {
                        "type": "string",
                        "description": "Número de teléfono para el registro (formato internacional ej: 573...)"
                    },
                    "fecha_nacimiento": {
                        "type": "string",
                        "description": "Fecha de nacimiento (opcional, formato AAAA-MM-DD)"
                    }
                },
                "required": ["nombre", "email", "telefono"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_order",
            "description": "Crea un pedido formal en el sistema una vez que el cliente ha confirmado los productos, el total y el método de entrega.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente_nombre": {"type": "string", "description": "Nombre del cliente"},
                    "cliente_telefono": {"type": "string", "description": "Teléfono de contacto"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "nombre": {"type": "string"},
                                "cantidad": {"type": "integer"},
                                "precio": {"type": "number"}
                            }
                        }
                    },
                    "tipo": {"type": "string", "enum": ["domicilio", "llevar", "mesa"]},
                    "direccion": {"type": "string", "description": "Dirección obligatoria si es domicilio"},
                    "metodo_pago": {"type": "string", "enum": ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta", "Link"]}
                },
                "required": ["items", "tipo", "metodo_pago"]
            }
        }
    }
]

async def get_menu_items(negocio_id: str) -> List[Dict]:
    """Helper to fetch all menu items for context or tools"""
    try:
        res = supabase.table('menu_items').select('*').eq('negocio_id', negocio_id).eq('available', True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching menu_items: {e}")
        return []

async def get_customer_name(phone: str) -> Optional[str]:
    try:
        # Remove 'whatsapp:' prefix if present
        clean_phone = phone.replace('whatsapp:', '').strip()
        res = supabase.table('clientes').select('nombre').eq('telefono', clean_phone).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]['nombre']
        return None
    except Exception:
        return None

# --- HISTORY MANAGEMENT ---

async def get_or_create_conversation(negocio_id: str, phone: str) -> str:
    """Get active conversation ID or create new one"""
    try:
        # Check for active conversation
        res = supabase.table('agent_conversations') \
            .select('id') \
            .eq('negocio_id', negocio_id) \
            .eq('phone_number', phone) \
            .eq('status', 'active') \
            .order('last_message_at', desc=True) \
            .limit(1) \
            .execute()
        
        if res.data:
            return res.data[0]['id']
        
        # Create new conversation
        try:
            supabase.table('agent_conversations').insert({
                "negocio_id": negocio_id,
                "phone_number": phone,
                "status": "active"
            }).execute()
        except Exception as e:
            # PGRST204 means success but no return body, which crashes python client sometimes
            if "PGRST204" not in str(e):
                logger.error(f"Error creating conversation: {e}")
        
        # Fetch the ID again to be sure
        res = supabase.table('agent_conversations') \
            .select('id') \
            .eq('negocio_id', negocio_id) \
            .eq('phone_number', phone) \
            .order('created_at', desc=True) \
            .limit(1) \
            .execute()
            
        if res.data:
            return res.data[0]['id']
        return None
    except Exception as e:
        logger.error(f"Error managing conversation: {e}")
        return None

async def save_message(conversation_id: str, direction: str, content: str):
    """Save message to history"""
    try:
        supabase.table('agent_messages').insert({
            "conversation_id": conversation_id,
            "direction": direction, # 'inbound' or 'outbound'
            "content": content,
            "message_type": "text"
        }).execute()
        
        # Update conversation timestamp
        supabase.table('agent_conversations').update({
            "last_message_at": datetime.now(timezone.utc).isoformat()
        }).eq('id', conversation_id).execute()
        
    except Exception as e:
        logger.error(f"Error saving message: {e}")

async def get_recent_messages(conversation_id: str, limit: int = 10) -> List[Dict]:
    """Get recent messages formatted for OpenAI"""
    try:
        res = supabase.table('agent_messages') \
            .select('direction, content') \
            .eq('conversation_id', conversation_id) \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()
        
        history = []
        # Reverse to get chronological order
        for msg in reversed(res.data):
            role = "user" if msg['direction'] == 'inbound' else "assistant"
            history.append({"role": role, "content": msg['content']})
            
        return history
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return []

async def process_whatsapp_message(message_body: str, sender_phone: str, negocio_id: str):
    """
    Procesa un mensaje de WhatsApp entrante usando OpenAI.
    """
    try:
        customer_name = await get_customer_name(sender_phone)
        
        # Get business info for the prompt
        biz_res = supabase.table('negocios').select('*').eq('id', negocio_id).execute()
        if not biz_res.data:
            return "Lo siento, este negocio no está configurado correctamente."
            
        biz = biz_res.data[0]
        biz_name = biz.get('nombre', 'Menu.IA')
        
        # AI Configuration
        ai_habilitado = biz.get('ai_habilitado', True)
        if not ai_habilitado:
            return "El asistente virtual está desactivado en este momento."
            
        ai_personalidad = biz.get('ai_personalidad', 'Amigable y cercano')
        ai_conocimiento = biz.get('ai_conocimiento', '')
        
        # 1. Definir System Prompt dinámico
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        
        system_prompt = f"""
Eres Menu.IA Bot, el asistente virtual oficial de {biz_name}. Tu objetivo es ayudar a los clientes a realizar pedidos de manera eficiente y gestionar su fidelización.

TU PERSONALIDAD:
{ai_personalidad}

CONOCIMIENTO ESPECIAL SOBRE EL NEGOCIO (ENTRENAMIENTO):
{ai_conocimiento if ai_conocimiento else 'Eres un asistente de restaurante estándar. Consulta el menú para dar información exacta.'}

REGISTRO DE CLIENTES Y FIDELIZACIÓN (PRIORIDAD ALTA):
- Si el nombre del cliente es '{customer_name if customer_name else 'cliente'}' (o desconocido), debes preguntarle su nombre al inicio para dar una atención personalizada.
- Si el cliente no está registrado, invítalo amablemente a unirse al programa de fidelización.
- Explica los beneficios: acumular puntos por cada compra, descuentos exclusivos y atención personalizada.
- Si el cliente acepta, pídele: Nombre completo, Correo electrónico y su Fecha de cumpleaños (opcional).
- IMPORTANTE: Pregunta si desea usar su número actual ({sender_phone}) o uno diferente.
- UNA VEZ TENGAS LOS DATOS (Nombre, Email, Teléfono), EJECUTA LA FUNCIÓN 'register_customer'. NO confirmes el registro sin llamar a la función.

REGLAS DE RESPUESTA DE PRODUCTOS Y MENÚ:
- Si el cliente quiere ver todo el menú, envíale el siguiente enlace interactivo: 
  https://menuia-production.up.railway.app/{slug}
- Al mostrar productos del menú de forma textual, estructúralos como una tabla o lista clara, rápida de leer (evita lenguaje tipo periódico o densos párrafos).
- Enumera los items o dales un código numérico para que el cliente pueda pedir más rápido enviando solo el número (Ej: "1. Hamburguesa Sencilla").
- Menciona siempre en la misma línea: NÚMERO DE ITEM, NOMBRE, PRECIO y DESCUENTO (si lo tiene). Agrega la descripción brevemente debajo.
- NUNCA incluyas enlaces o URLs de imágenes de los productos en tus respuestas.

REGLAS DE INTERACCIÓN:
- Saluda amablemente y sé siempre cortés.
- NUNCA inventes platos o precios. Usa las herramientas de función para consultar el menú real.
- CONFIRMA siempre el pedido con el cliente antes de finalizarlo (items, total, dirección).
- Sé conciso, apropiado para un chat rápido.
- Dirígete al cliente por su nombre si ya lo tienes.

HOY ES: {now} (UTC)
"""
        
        # 1.1 Gestionar Historial
        conversation_id = await get_or_create_conversation(negocio_id, sender_phone)
        
        # Save Incoming Message
        if conversation_id:
            await save_message(conversation_id, 'inbound', message_body)
            
        # Fetch History
        history_messages = []
        if conversation_id:
            # We fetch previous messages (excluding the one we just saved if we want, 
            # but wait, fetching limit=10 will include it. 
            # OpenAI expects the last message to be user? 
            # Actually, standard chat format is list of messages.
            # If we saved 'inbound', get_recent_messages will return it as the last item.
            # So we don't need to append message_body manually to 'messages'.
            history_messages = await get_recent_messages(conversation_id, limit=10)
        
        # If history extraction failed or returned empty (unlikely if we just saved), fallback using message_body
        if not history_messages:
             messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message_body}
            ]
        else:
            messages = [{"role": "system", "content": system_prompt}] + history_messages

        # 2. Llamada inicial a OpenAI
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls
        
        logger.info(f"OpenAI response tool_calls: {tool_calls}")

        # 3. Manejar llamadas a herramientas (Function Calling Loop)
        if tool_calls:
            # Añadir mensaje del asistente con las llamadas a herramientas al historial
            messages.append(response_message)
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                tool_call_id = tool_call.id
                
                logger.info(f"OpenAI sugirió ejecutar: {function_name} con {function_args}")
                
                function_response = None
                
                # Ejecutar función real
                if function_name == "get_menu_categories":
                    function_response = await get_menu_categories(negocio_id)
                elif function_name == "get_products_by_category":
                    function_response = await get_products_by_category(negocio_id, function_args.get("category"))
                elif function_name == "search_products":
                    function_response = await search_products(negocio_id, function_args.get("query"))
                elif function_name == "register_customer":
                    function_response = await register_customer(
                        negocio_id, 
                        function_args.get("nombre"),
                        function_args.get("email"),
                        function_args.get("telefono"),
                        function_args.get("fecha_nacimiento")
                    )
                elif function_name == "create_order":
                    function_response = await create_order_ai(negocio_id, function_args)
                else:
                    function_response = json.dumps({"error": "Función no implementada"})

                # Añadir respuesta de la función al historial
                messages.append(
                    {
                        "tool_call_id": tool_call_id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response,
                    }
                )
            
            # Segunda llamada a OpenAI con las respuestas de las funciones
            second_response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
            )
            
            final_response = second_response.choices[0].message.content
            
            # Save Outbound Response (after tool execution)
            if conversation_id and final_response:
                 await save_message(conversation_id, 'outbound', final_response)

            return final_response

        # 4. Si no hubo herramientas, devolver texto directo
        # 4. Si no hubo herramientas, devolver texto directo
        final_response = response_message.content
        
        # Save Outbound Response
        if conversation_id and final_response:
             await save_message(conversation_id, 'outbound', final_response)
             
        return final_response

    except Exception as e:
        logger.error(f"Error procesando mensaje WA: {e}")
        return "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?"

# --- IMPLEMENTACIÓN DE HERRAMIENTAS ---

async def get_menu_categories(negocio_id: str) -> str:
    try:
        response = supabase.table('menu_items') \
            .select('category') \
            .eq('negocio_id', negocio_id) \
            .eq('available', True) \
            .execute()
        
        categories = list(set([item['category'] for item in response.data]))
        return json.dumps(categories)
    except Exception as e:
        logger.error(f"Error get_menu_categories: {e}")
        return json.dumps({"error": str(e)})

async def get_products_by_category(negocio_id: str, category: str) -> str:
    try:
        response = supabase.table('menu_items') \
            .select('*') \
            .eq('negocio_id', negocio_id) \
            .eq('category', category) \
            .eq('available', True) \
            .execute()
        return json.dumps(response.data)
    except Exception as e:
        logger.error(f"Error get_products_by_category: {e}")
        return json.dumps({"error": str(e)})

async def search_products(negocio_id: str, query: str) -> str:
    try:
        response = supabase.table('menu_items') \
            .select('*') \
            .eq('negocio_id', negocio_id) \
            .ilike('name', f'%{query}%') \
            .eq('available', True) \
            .execute()
        return json.dumps(response.data)
    except Exception as e:
        logger.error(f"Error search_products: {e}")
        return json.dumps({"error": str(e)})

async def create_order_ai(negocio_id: str, args: Dict[str, Any]) -> str:
    try:
        # 0. Fetch Business Data for notifications and credits
        biz_res = supabase.table('negocios').select('*').eq('id', negocio_id).execute()
        if not biz_res.data:
            return json.dumps({"status": "error", "message": "Negocio no encontrado"})
        biz_data = biz_res.data[0]
        business_name = biz_data['nombre']
        business_phone = biz_data.get('whatsapp') or biz_data.get('telefono')
        
        # Twilio Config
        twilio_config = {
            "sid": biz_data.get('twilio_sid'),
            "token": biz_data.get('twilio_token'),
            "number": biz_data.get('twilio_number')
        } if biz_data.get('twilio_sid') else None

        # 1. Calculate Total
        items = args.get('items', [])
        total = sum(item.get('precio', 0) * item.get('cantidad', 1) for item in items)
        
        tipo_ai = args.get('tipo', 'delivery')
        if tipo_ai == 'domicilio': tipo_ai = 'delivery'
        elif tipo_ai == 'llevar': tipo_ai = 'whatsapp'
        elif tipo_ai == 'mesa': tipo_ai = 'mesa'
        
        # 2. Insert order
        order_data = {
            "negocio_id": negocio_id,
            "items": items,
            "total": total,
            "cliente_nombre": args.get('cliente_nombre'),
            "cliente_telefono": args.get('cliente_telefono'),
            "tipo_pedido": tipo_ai,
            "direccion": args.get('direccion'),
            "metodo_pago": args.get('metodo_pago', 'Efectivo'),
            "estado": "pendiente",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        print(f"DEBUG order_data: {order_data}")
        res = supabase.table('pedidos').insert(order_data).execute()
        order_id = res.data[0]['id'] if res.data else "new_order"
        
        # 3. Deduct 2 Credits (for notifications)
        wa_credits = biz_data.get('wa_credits', 0)
        wa_count = biz_data.get('wa_messages_count', 0)
        credits_to_deduct = 2
        
        if wa_credits >= credits_to_deduct:
            supabase.table('negocios').update({"wa_credits": wa_credits - credits_to_deduct}).eq("id", negocio_id).execute()
        else:
            supabase.table('negocios').update({"wa_messages_count": wa_count + credits_to_deduct}).eq("id", negocio_id).execute()

        # 4. Send Notifications (Async/Background simplified)
        summary = f"💰 *Total: ${total:,.0f}*\n"
        for item in items:
            summary += f"- {item['cantidad']}x {item['nombre']} (${item['precio']:,.0f})\n"
        
        client_phone = args.get('cliente_telefono')
        if client_phone:
            client_msg = f"✅ *¡Pedido Confirmado en {business_name}!*\n\nHola {args.get('cliente_nombre', 'cliente')}, hemos recibido tu pedido #{order_id[:8].upper()}.\n\n{summary}\n📌 *Método:* {args.get('tipo', 'llevar')}\n💳 *Pago:* {args.get('metodo_pago')}\n\nPuedes rastrear tu pedido aquí: https://menuia.co/{biz_data.get('slug')}/mis-pedidos?order={order_id}"
            send_whatsapp_response(client_phone, client_msg, twilio_config)
            
        if business_phone:
            biz_msg = f"🔔 *NUEVO PEDIDO IA* en {business_name}\n\nCliente: {args.get('cliente_nombre')}\nTel: {client_phone}\n\n{summary}\n📍 *Tipo:* {args.get('tipo')}\n🏠 *Dirección:* {args.get('direccion', 'N/A')}\n\nRevisa el dashboard: https://menuia.co/dashboard/{biz_data.get('slug')}/pedidos"
            send_whatsapp_response(business_phone, biz_msg, twilio_config)

        return json.dumps({
            "status": "success", 
            "order_id": order_id,
            "message": f"Pedido creado con éxito por un total de ${total:,.0f}."
        })
    except Exception as e:
        logger.error(f"Error create_order_ai: {e}")
        return json.dumps({"status": "error", "message": str(e)})

async def register_customer(negocio_id: str, nombre: str, email: str, telefono: str, fecha_nacimiento: str = None) -> str:
    try:
        # Sanitize phone
        clean_phone = str(telefono).replace('whatsapp:', '').replace('+', '').replace(' ', '').strip()
        
        # Sanitize date
        birth_date = fecha_nacimiento
        import re
        if not birth_date or birth_date.strip() == "":
            birth_date = None
        elif not re.match(r'^\d{4}-\d{2}-\d{2}$', birth_date):
            logger.warning(f"Invalid date format: {birth_date}. Setting to None.")
            birth_date = None
        
        # 1. Update/Insert in 'clientes' (Global)
        try:
            supabase.table('clientes').upsert({
                "telefono": clean_phone,
                "nombre": nombre,
                "email": email
            }, on_conflict='telefono').execute()
        except Exception as e:
            if "PGRST204" not in str(e):
                logger.error(f"Error upserting cliente: {e}")
        
        # 2. Check existence in 'clientes_puntos'
        existing_cp = supabase.table('clientes_puntos') \
            .select('id') \
            .eq('negocio_id', negocio_id) \
            .eq('telefono', clean_phone) \
            .execute()
        
        cp_data = {
            "negocio_id": negocio_id,
            "telefono": clean_phone,
            "nombre": nombre,
            "email": email,
            "fecha_nacimiento": birth_date,
            "puntos_actuales": 0,
            "puntos_totales": 0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Attempting upsert clientes_puntos: {cp_data}")
        # 2. Update/Insert in 'clientes_puntos' using RPC (safer/atomic)
        try:
            rpc_params = {
                "p_negocio_id": negocio_id,
                "p_telefono": clean_phone,
                "p_nombre": nombre,
                "p_email": email,
                "p_fecha_nacimiento": birth_date
            }
            logger.info(f"Calling RPC register_client_points with: {rpc_params}")
            supabase.rpc("register_client_points", rpc_params).execute()
        except Exception as e:
            logger.error(f"Error executing RPC register_client_points: {e}")
            # If RPC fails, we still consider global registration? 
            # Better to report error
            raise e
        
        return json.dumps({"status": "success", "message": f"¡Excelente! Ya te he registrado como {nombre}. Ahora puedes acumular puntos en tus compras."})
    except Exception as e:
        logger.error(f"Error register_customer: {e}")
        with open("error_log.txt", "a") as f:
            f.write(f"Error register_customer: {str(e)}\n")
        return json.dumps({"status": "error", "message": f"Lo siento, hubo un error al registrarte: {str(e)}"})

def send_whatsapp_response(to_number: str, body: str, custom_config: Dict[str, Any] = None):
    """
    Sends a WhatsApp message using custom business credentials or global fallback.
    custom_config: { 'sid': str, 'token': str, 'number': str }
    """
    try:
        # 1. Determine which credentials to use
        sid = custom_config.get('sid') if custom_config else None
        token = custom_config.get('token') if custom_config else None
        from_number = custom_config.get('number') if custom_config else GLOBAL_TWILIO_NUMBER
        
        # 2. Initialize Client
        client = get_twilio_client(sid, token)
        
        # 3. Sanitize and format destination number
        clean_number = to_number.replace(' ', '').replace('+', '').replace('-', '')
        
        # Default to Colombia (+57) if 10 digits
        if len(clean_number) == 10 and clean_number.startswith('3'):
            formatted_number = f"+57{clean_number}"
        elif len(clean_number) == 12 and clean_number.startswith('57'):
            formatted_number = f"+{clean_number}"
        else:
            # Fallback
            formatted_number = f"+{clean_number}" if not to_number.startswith('+') else to_number

        # 4. Send Message
        message = client.messages.create(
            from_=from_number if from_number.startswith('whatsapp:') else f"whatsapp:{from_number}",
            body=body,
            to=f"whatsapp:{formatted_number}"
        )
        logger.info(f"Mensaje enviado a {formatted_number} [SID: {sid or 'Global'}]: {message.sid}")
        return message.sid
    except Exception as e:
        logger.error(f"Error enviando respuesta WA a {to_number}: {e}")
        return None

# Export for external use
__all__ = ['send_whatsapp_response', 'process_whatsapp_message', 'get_or_create_conversation']
