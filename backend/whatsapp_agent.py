import os
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timezone
from openai import OpenAI
from twilio.rest import Client
from supabase import create_client, Client as SupabaseClient
from ai_base import get_shared_instructions, get_fallback_message

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Initialize Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role Key for backend ops
supabase: SupabaseClient = create_client(supabase_url, supabase_key)

# Initialize Twilio
twilio_client = Client(
    os.environ.get("TWILIO_ACCOUNT_SID"), 
    os.environ.get("TWILIO_AUTH_TOKEN")
)
twilio_number = os.environ.get("TWILIO_WHATSAPP_NUMBER")

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
    # TODO: Add more tools for order creation and status check
]

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
Eres Menu.IA Bot, el asistente virtual oficial de {biz_name}. Tu objetivo es ayudar a los clientes a realizar pedidos de manera eficiente.

TU PERSONALIDAD:
{ai_personalidad}

CONOCIMIENTO ESPECIAL SOBRE EL NEGOCIO (ENTRENAMIENTO):
{ai_conocimiento if ai_conocimiento else 'Eres un asistente de restaurante estándar. Consulta el menú para dar información exacta.'}

REGLAS DE INTERACCIÓN:
- Saluda amablemente.
- NUNCA inventes platos o precios. Usa las herramientas de función para consultar el menú real.
- CONFIRMA siempre el pedido con el cliente antes de finalizarlo (items, total, dirección).
- Sé conciso, apropiado para WhatsApp.
- Dirígete al cliente como {customer_name if customer_name else 'cliente'} si es apropiado.

HOY ES: {now} (UTC)
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message_body}
        ]

        # 2. Llamada inicial a OpenAI
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

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
            
            return second_response.choices[0].message.content

        # 4. Si no hubo herramientas, devolver texto directo
        return response_message.content

    except Exception as e:
        logger.error(f"Error procesando mensaje WA: {e}")
        return "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?"

# --- IMPLEMENTACIÓN DE HERRAMIENTAS ---

async def get_menu_categories(negocio_id: str) -> str:
    try:
        response = supabase.table('productos') \
            .select('categoria') \
            .eq('negocio_id', negocio_id) \
            .eq('disponible', True) \
            .execute()
        
        categories = list(set([item['categoria'] for item in response.data]))
        return json.dumps(categories)
    except Exception as e:
        logger.error(f"Error get_menu_categories: {e}")
        return json.dumps({"error": str(e)})

async def get_products_by_category(negocio_id: str, category: str) -> str:
    try:
        response = supabase.table('productos') \
            .select('*') \
            .eq('negocio_id', negocio_id) \
            .eq('categoria', category) \
            .eq('disponible', True) \
            .execute()
        return json.dumps(response.data)
    except Exception as e:
        logger.error(f"Error get_products_by_category: {e}")
        return json.dumps({"error": str(e)})

async def search_products(negocio_id: str, query: str) -> str:
    try:
        response = supabase.table('productos') \
            .select('*') \
            .eq('negocio_id', negocio_id) \
            .ilike('nombre', f'%{query}%') \
            .eq('disponible', True) \
            .execute()
        return json.dumps(response.data)
    except Exception as e:
        logger.error(f"Error search_products: {e}")
        return json.dumps({"error": str(e)})

def send_whatsapp_response(to_number: str, body: str):
    try:
        # Sanitize and format number
        clean_number = to_number.replace(' ', '').replace('+', '').replace('-', '')
        
        # Default to Colombia (+57) if 10 digits
        if len(clean_number) == 10 and clean_number.startswith('3'):
            formatted_number = f"+57{clean_number}"
        elif len(clean_number) == 12 and clean_number.startswith('57'):
            formatted_number = f"+{clean_number}"
        else:
            # Fallback (maybe user provided another country code or it is international)
            formatted_number = f"+{clean_number}" if not to_number.startswith('+') else to_number

        message = twilio_client.messages.create(
            from_=twilio_number,
            body=body,
            to=f"whatsapp:{formatted_number}"
        )
        logger.info(f"Mensaje enviado a {formatted_number}: {message.sid}")
    except Exception as e:
        logger.error(f"Error enviando respuesta WA: {e}")
