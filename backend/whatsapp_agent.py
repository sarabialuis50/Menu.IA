import os
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timezone
from openai import OpenAI
from twilio.rest import Client
from supabase import create_client, Client as SupabaseClient
from ai_base import get_shared_instructions, get_fallback_message
from dotenv import load_dotenv
from whatsapp_templates import get_template_data  # Nueva importación

load_dotenv()

# Configuración de logging (stdout para Railway)
logging.basicConfig(
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

logger.info(f"ENV CHECK: TWILIO_ACCOUNT_SID_MENU_IA={'SET' if os.environ.get('TWILIO_ACCOUNT_SID_MENU_IA') else 'MISSING'}")
logger.info(f"ENV CHECK: TWILIO_AUTH_TOKEN_MENU_IA={'SET' if os.environ.get('TWILIO_AUTH_TOKEN_MENU_IA') else 'MISSING'}")
logger.info(f"ENV CHECK: TWILIO_WHATSAPP_FROM_MENU_IA={'SET' if os.environ.get('TWILIO_WHATSAPP_FROM_MENU_IA') else 'MISSING'}")

# Initialize Twilio (Global Fallback - SaaS_MenuIA subaccount)
GLOBAL_TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID_MENU_IA") or os.environ.get("TWILIO_ACCOUNT_SID")
GLOBAL_TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN_MENU_IA") or os.environ.get("TWILIO_AUTH_TOKEN")
GLOBAL_TWILIO_NUMBER = os.environ.get("TWILIO_WHATSAPP_FROM_MENU_IA") or os.environ.get("TWILIO_WHATSAPP_NUMBER")

logger.info(f"Twilio Config Loaded: SID={str(GLOBAL_TWILIO_SID)[:6]}... Number={GLOBAL_TWILIO_NUMBER}")

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
                                "precio": {"type": "number"},
                                "modificadores": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Lista de opciones seleccionadas (ej: ['Grande', 'Extra Queso'])"
                                }
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

PLATFORM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "find_nearest_restaurant",
            "description": "Busca el restaurante más cercano dada una dirección del usuario o sus coordenadas GPS. También permite filtrar por tipo de comida.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {
                        "type": "string",
                        "description": "La dirección completa del usuario (opcional si se pasan coordenadas)."
                    },
                    "latitude": {
                        "type": "number",
                        "description": "Latitud GPS del usuario (opcional)."
                    },
                    "longitude": {
                        "type": "number",
                        "description": "Longitud GPS del usuario (opcional)."
                    },
                    "food_query": {
                        "type": "string",
                        "description": "Tipo de comida que busca el usuario (ej: 'hamburguesa', 'pizza')."
                    }
                }
            }
        }
    }
]

PLATFORM_SYSTEM_PROMPT = """
Eres el Asistente Global de Menu.IA, una plataforma inteligente que conecta a clientes con los mejores restaurantes y cafeterías. 
Tu objetivo principal es ayudar al usuario a encontrar el lugar ideal para comer y proporcionarle el enlace directo a su menú interactivo.

REGLAS DE INTERACCIÓN:
1. Saluda amablemente y preséntate como el asistente de Menu.IA.
2. Si el usuario busca un restaurante o quiere comer algo específico (ej: "hamburguesa", "pizza"), es OBLIGATORIO pedirle su ubicación para encontrar la opción más cercana que tenga lo que busca.
3. El usuario puede enviarte su dirección por texto o compartirte su ubicación GPS de WhatsApp.
   - Si recibes algo como "[UBICACIÓN GPS: lat, lng]", usa esos valores directamente en 'find_nearest_restaurant'.
4. Una vez que tengas la ubicación (y el tipo de comida si aplica), usa la herramienta 'find_nearest_restaurant'.
5. Cuando encuentres el restaurante:
   - Indica el nombre del negocio, qué tan cerca está y si vende lo que el usuario buscaba.
   - Proporciona OBLIGATORIAMENTE el enlace interactivo al menú en una línea nueva e independiente (con saltos de línea):

Puedes ver el menú completo aquí:
https://menuia.co/{{slug}}/menu
6. PROHIBIDO usar sintaxis de Markdown para enlaces como [Texto](URL). En WhatsApp esto no funciona. Proporciona ÚNICAMENTE la URL plana (ej: https://menuia.co/slug/menu) para que el sistema la convierta automáticamente en un enlace azul clickable.
7. Si no encuentras exactamente lo que pidió pero hay opciones cerca, menciónalo cordialmente.
8. Sé amable, conciso y directo, optimizado para WhatsApp.

HOY ES: {current_date}
"""

async def find_nearest_restaurant(address: str = None, latitude: float = None, longitude: float = None, food_query: str = None) -> str:
    """Finds the nearest business based on geocoding/coords and distance, optionally filtered by food"""
    try:
        import requests
        import math

        u_lat, u_lng = None, None

        # 1. Get user coordinates
        if latitude is not None and longitude is not None:
            u_lat, u_lng = float(latitude), float(longitude)
        elif address:
            api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
            if not api_key:
                return json.dumps({"error": "Geocoding service unavailable (missing API key)"})

            # Append Colombia for better precision if not present
            geo_address = address if "colombia" in address.lower() else f"{address}, Colombia"
            geo_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={geo_address}&key={api_key}"
            geo_res = requests.get(geo_url).json()
            
            if geo_res.get('results'):
                user_loc = geo_res['results'][0]['geometry']['location']
                u_lat, u_lng = user_loc['lat'], user_loc['lng']
        
        if u_lat is None or u_lng is None:
            return json.dumps({"error": "No pude ubicar esa dirección o coordenadas. ¿Podrías ser más específico?"})

        # 2. Fetch businesses
        # Ideally we'd filter by food_query in the DB, but for now we fetch and maybe filter later
        # If food_query is provided, we might want to join with menu_items
        if food_query:
            # Simple keyword search in products to find businesses that have it
            prod_res = supabase.table('menu_items') \
                .select('negocio_id') \
                .ilike('name', f'%{food_query}%') \
                .execute()
            
            if not prod_res.data:
                return json.dumps({"error": f"No encontré restaurantes que vendan '{food_query}' cerca de ti."})
            
            biz_ids = list(set([p['negocio_id'] for p in prod_res.data]))
            biz_res = supabase.table('negocios').select('id, nombre, slug, lat, lng, direccion').in_('id', biz_ids).execute()
        else:
            biz_res = supabase.table('negocios').select('id, nombre, slug, lat, lng, direccion').execute()

        if not biz_res.data:
            return json.dumps({"error": "No hay negocios registrados que coincidan con tu búsqueda."})

        # 3. Calculate distances (Haversine)
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371 # Radius of Earth in KM
            dLat = math.radians(lat2 - lat1)
            dLon = math.radians(lon2 - lon1)
            a = math.sin(dLat/2) * math.sin(dLat/2) + \
                math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
                math.sin(dLon/2) * math.sin(dLon/2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c

        nearest = None
        min_dist = float('inf')

        for biz in biz_res.data:
            if biz.get('lat') and biz.get('lng'):
                dist = haversine(u_lat, u_lng, biz['lat'], biz['lng'])
                if dist < min_dist:
                    min_dist = dist
                    nearest = biz
        
        if nearest:
            return json.dumps({
                "status": "success",
                "negocio": nearest['nombre'],
                "slug": nearest['slug'],
                "distancia_km": round(min_dist, 2),
                "direccion": nearest['direccion'],
                "menu_url": f"https://menuia.co/{nearest['slug']}/menu",
                "food_found": food_query is not None
            })
        else:
            return json.dumps({"error": "No encontré negocios con ubicación configurada cerca de ti."})

    except Exception as e:
        logger.error(f"Error find_nearest_restaurant: {e}")
        return json.dumps({"error": f"Error interno: {str(e)}"})

async def process_whatsapp_message(message_body: str, sender_phone: str, negocio_id: str = None):
    """
    Procesa un mensaje de WhatsApp entrante usando OpenAI.
    Si negocio_id es None o 'PLATFORM', actúa como asistente global.
    """
    try:
        PLATFORM_BIZ_ID = "f92dc309-3b2b-4ddd-b8c6-723de6da38f3"
        is_platform = not negocio_id or negocio_id == 'PLATFORM' or negocio_id == PLATFORM_BIZ_ID
        customer_name = await get_customer_name(sender_phone)
        
        # 0. Common variables
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        
        # AI Configuration
        if is_platform:
            biz_name = "Menu.IA"
            biz_slug = "platform"
            ai_habilitado = True
            current_tools = PLATFORM_TOOLS
            system_prompt = PLATFORM_SYSTEM_PROMPT.format(current_date=now)
        else:
            # Get business info for the prompt
            biz_res = supabase.table('negocios').select('*').eq('id', negocio_id).execute()
            if not biz_res.data:
                return "Lo siento, este negocio no está configurado correctamente."
                
            biz = biz_res.data[0]
            biz_name = biz.get('nombre', 'Menu.IA')
            biz_slug = biz.get('slug', '')
            ai_habilitado = biz.get('ai_habilitado', True)
            ai_personalidad = biz.get('ai_personalidad', 'Amigable y cercano')
            ai_conocimiento = biz.get('ai_conocimiento', '')
            current_tools = TOOLS
            
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
- SIEMPRE que el cliente pida el menú o quiera ver los platos, es OBLIGATORIO proporcionar el enlace interactivo en UNA LÍNEA NUEVA E INDEPENDIENTE (con un salto de línea antes y después) para que sea resaltado como un enlace azul clickable:

https://menuia.co/{biz_slug}/menu

(Asegúrate de que no haya texto en la misma línea que el enlace).
- PROHIBIDO usar sintaxis de Markdown como [Texto](URL). En WhatsApp esto no funciona. Proporciona la URL plana: https://menuia.co/{biz_slug}/menu

- Al mostrar productos del menú de forma textual (además del enlace), usa EXACTAMENTE esta estructura organizada por categorías:
### Nombre de la Categoría

1) Nombre del Producto
Descripción del producto
$Precio (ej: $23.000)

2) Nombre del Producto
Descripción del producto
$Precio

(Deja un espacio entre cada item para que sea fácil de leer).

- Enumera los items de forma correlativa (1, 2, 3...) para que el cliente pueda pedir enviando solo el número del producto.
- Usa el símbolo '$' seguido del precio con puntos de miles para los precios.
- NUNCA incluyas enlaces o URLs de imágenes de los productos en tus respuestas.

REGLAS DE INTERACCIÓN:
- Saluda amablemente y sé siempre cortés.
- NUNCA inventes platos o precios. Usa las herramientas de función para consultar el menú real.
- CONFIRMA siempre el pedido con el cliente antes de finalizarlo (items, total, dirección).
- Sé conciso, apropiado para un chat rápido.
- Dirígete al cliente por su nombre si ya lo tienes.

HOY ES: {now} (UTC)
"""

        if not ai_habilitado:
            return "El asistente virtual está desactivado en este momento."
            
        # 1.1 Gestionar Historial
        target_biz_id = negocio_id if negocio_id else 'PLATFORM'
        conversation_id = await get_or_create_conversation(target_biz_id, sender_phone)
        
        # Save Incoming Message
        if conversation_id:
            await save_message(conversation_id, 'inbound', message_body)
            
        # Fetch History
        history_messages = await get_recent_messages(conversation_id, limit=10)
        
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
            tools=current_tools,
            tool_choice="auto"
        )
        
        # 3. Procesar Tool Calls
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls
        
        if tool_calls:
            messages.append(response_message)
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"AI calling function: {function_name} with {function_args}")
                
                function_response = ""
                if function_name == "get_menu_categories":
                    function_response = await get_menu_categories(negocio_id)
                elif function_name == "get_products_by_category":
                    function_response = await get_products_by_category(negocio_id, function_args.get('category'))
                elif function_name == "search_products":
                    function_response = await search_products(negocio_id, function_args.get('query'))
                elif function_name == "register_customer":
                    function_response = await register_customer(
                        negocio_id, 
                        function_args.get('nombre'),
                        function_args.get('email'),
                        function_args.get('telefono'),
                        function_args.get('fecha_nacimiento')
                    )
                elif function_name == "create_order":
                    function_response = await create_order_ai(negocio_id, function_args)
                elif function_name == "find_nearest_restaurant":
                    function_response = await find_nearest_restaurant(
                        function_args.get('address'),
                        function_args.get('latitude'),
                        function_args.get('longitude'),
                        function_args.get('food_query')
                    )
                
                logger.info(f"Tool {function_name} response: {function_response}")
                
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": function_response,
                })
            
            # Segunda llamada con resultados de funciones
            second_response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            final_response = second_response.choices[0].message.content
        else:
            final_response = response_message.content
            
        # Save Outbound Response
        if conversation_id and final_response:
             await save_message(conversation_id, 'outbound', final_response)
             
        return final_response

    except Exception as e:
        import traceback
        error_msg = f"Error procesando mensaje WA: {e}\n{traceback.format_exc()}"
        logger.error(error_msg)
        with open("agent_errors.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- {datetime.now()} ---\n{error_msg}\n")
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
            "tipo": tipo_ai,
            "direccion": args.get('direccion'),
            "metodo_pago": args.get('metodo_pago', 'Efectivo'),
            "estado": "pendiente",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        
        # Generar número secuencial diario
        today_start_sec = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cq_res = supabase.table('pedidos').select('id', count='exact')\
            .eq('negocio_id', negocio_id)\
            .gte('created_at', today_start_sec.isoformat()).execute()
        
        order_data["numero_secuencial"] = (cq_res.count or 0) + 1
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

        # 4. Send Notifications using approved template
        fecha = datetime.now(timezone.utc).strftime("%d/%m/%Y, %H:%M")
        biz_slug = biz_data.get('slug', '')
        
        # Build cart detail - VERTICAL FORMAT with Labels
        detalle_items = []
        product_notes = []
        for idx, item in enumerate(items, 1):
            p_name = item.get('nombre', '?')
            p_qty = item.get('cantidad', 1)
            p_price = item.get('precio', 0)
            line = f"\n* {idx}. {p_name} x{p_qty} (${p_price:,.0f}) "
            
            # Process extras
            tamanos = item.get('tamanos', [])
            adicionales = item.get('adicionales', [])
            opciones = item.get('opciones', [])
            
            mods = tamanos + adicionales + opciones
            for m in mods:
                line += f"\n*({p_qty}) {m}, "
            
            p_notes = item.get('notas')
            if p_notes and str(p_notes).lower() not in ["no aplica", "ninguna", "", "null", "none"]:
                line += f"\n* Observación: {p_notes}"
            
            detalle_items.append(line)
            
        detalle_carrito = "".join(detalle_items)
        
        # Build business-specific link
        link_negocio = f"https://menuia.co/{biz_slug}" if biz_slug else "https://menuia.co"
        if biz_slug: link_negocio += "/menu"
        
        cliente_info = f"\n\n*Nombre: {args.get('cliente_nombre', 'Cliente')} \n*Tel: {args.get('cliente_telefono', 'N/A')}"
        
        # Delivery Info
        entrega_info = f"{args.get('tipo', 'Domicilio').capitalize()} \n\n"
        entrega_info += f"* Dirección: {args.get('direccion', 'Punto de venta')} \n"
        entrega_info += f"* Distancia: {args.get('distancia', 'N/A')} km \n"
        if args.get('notas_entrega'):
            entrega_info += f"* Observación de entrega: {args.get('notas_entrega')}"

        template_kwargs = {
            "negocio_nombre": business_name,
            "pedido_id": order_id[:8].upper(),
            "cliente_info": cliente_info,
            "detalle_carrito": detalle_carrito,
            "entrega_info": entrega_info,
            "resumen_pago": f"\n\n* Subtotal: ${total:,.0f} \n* Envío: $0 \n* TOTAL: ${total:,.0f}\n",
            "metodo_pago": args.get('metodo_pago', 'Efectivo'),
            "metodo_entrega": args.get('tipo', 'Domicilio'),
            "fecha": fecha,
            "link_seguimiento": f"https://menuia.co/{biz_slug}/mis-pedidos"
        }
        
        client_phone = args.get('cliente_telefono')
        if client_phone:
            send_whatsapp_template(
                to_number=client_phone,
                template_key="resumen_pedido",
                custom_config=twilio_config,
                **template_kwargs
            )
            
        if business_phone:
            send_whatsapp_template(
                to_number=business_phone,
                template_key="resumen_pedido",
                custom_config=twilio_config,
                **template_kwargs
            )

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

async def send_whatsapp_message(to_number: str, body: str):
    """
    Función reutilizable para enviar mensajes de WhatsApp usando la cuenta SaaS_MenuIA.
    to_number: número en formato E.164 (+57xxxxxxxxxx) sin el prefijo 'whatsapp:'
    """
    try:
        client = Client(GLOBAL_TWILIO_SID, GLOBAL_TWILIO_AUTH_TOKEN)
        
        # Asegurar formato E.164 (+...) y luego whatsapp:
        clean_to = str(to_number).strip().replace('whatsapp:', '').replace(' ', '').replace('+', '')
        
        # Validar si es un número de Colombia (10 dígitos empezando por 3)
        if len(clean_to) == 10 and clean_to.startswith('3'):
            formatted_to_e164 = f"+57{clean_to}"
        elif len(clean_to) == 12 and clean_to.startswith('57'):
            formatted_to_e164 = f"+{clean_to}"
        else:
            formatted_to_e164 = f"+{clean_to}" if not str(to_number).startswith('+') else str(to_number)

        formatted_to = f"whatsapp:{formatted_to_e164}"
        logger.info(f"Twilio Send Attempt: From={GLOBAL_TWILIO_NUMBER} To={formatted_to} Body={body}")
        
        message = client.messages.create(
            from_=GLOBAL_TWILIO_NUMBER,
            body=body,
            to=formatted_to
        )
        logger.info(f"Mensaje enviado a {to_number} [SaaS_MenuIA]: {message.sid}")
        return message
    except Exception as e:
        logger.error(f"Error en send_whatsapp_message: {e}")
        raise e

def send_whatsapp_response(to_number: str, body: str, custom_config: Dict[str, Any] = None):
    """
    Sends a WhatsApp message using custom business credentials or global fallback (SaaS_MenuIA).
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

def send_whatsapp_template(to_number: str, template_key: str, custom_config: Dict[str, Any] = None, **kwargs):
    """
    Envía un mensaje usando las nuevas plantillas de Twilio aprobadas.
    Si la plantilla no tiene un SID configurado, intenta enviar un fallback de texto.
    """
    try:
        content_sid, content_variables = get_template_data(template_key, **kwargs)
        
        if not content_sid:
            logger.warning(f"Template {template_key} sin SID configurado. Usando fallback de texto.")
            return None

        sid = custom_config.get('sid') if custom_config else None
        token = custom_config.get('token') if custom_config else None
        from_number = custom_config.get('number') if custom_config else GLOBAL_TWILIO_NUMBER
        
        client = get_twilio_client(sid, token)
        
        # Formatear número (misma lógica que send_whatsapp_response)
        clean_number = to_number.replace(' ', '').replace('+', '').replace('-', '').replace('whatsapp:', '')
        
        # Default to Colombia (+57) if 10 digits starting with 3
        if len(clean_number) == 10 and clean_number.startswith('3'):
            formatted_to = f"whatsapp:+57{clean_number}"
        elif len(clean_number) == 12 and clean_number.startswith('57'):
            formatted_to = f"whatsapp:+{clean_number}"
        else:
            formatted_to = f"whatsapp:+{clean_number}"

        message = client.messages.create(
            from_=from_number if from_number.startswith('whatsapp:') else f"whatsapp:{from_number}",
            to=formatted_to,
            content_sid=content_sid,
            content_variables=json.dumps(content_variables) if isinstance(content_variables, dict) else content_variables
        )
        
        logger.info(f"Plantilla {template_key} enviada a {to_number}. SID: {message.sid}")
        return message.sid
    except Exception as e:
        logger.error(f"Error enviando plantilla {template_key} a {to_number}: {e}")
        return None

# Export for external use
__all__ = ['send_whatsapp_response', 'send_whatsapp_message', 'process_whatsapp_message', 'get_or_create_conversation', 'send_whatsapp_template']
