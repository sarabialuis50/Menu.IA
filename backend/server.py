from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json
import time
import asyncio
import uuid
from pathlib import Path
import secrets

# Force deploy trigger
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import google.generativeai as genai
from fastapi import Request
from openai import OpenAI
from ai_base import get_shared_instructions, get_fallback_message
import traceback

logger = logging.getLogger(__name__)

# Import WhatsApp Agent Functions (now env vars are loaded)
from whatsapp_agent import process_whatsapp_message, send_whatsapp_response, send_whatsapp_message, get_or_create_conversation

from models import Business, BusinessCreate, BusinessLogin, BusinessPublic, BusinessAnalytics, DailyStats
from models import ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
from models import Product, ProductCreate, ProductUpdate
from models import Table, TableCreate, TableUpdate, TableStatus
from models import Employee, EmployeeCreate, EmployeeLogin, EmployeeRole
from models import Order, OrderCreate, OrderUpdate, OrderStatus, OrderItem
from models import TokenResponse, EmployeeTokenResponse, WhatsAppConfig
from models import LoyaltyConfig, LoyaltyConfigCreate, LoyaltyConfigUpdate
from models import CustomerPoints, CustomerPointsPublic, CustomerCreate, PointsTransaction
from models import RedeemPointsRequest, RedeemPointsResponse, AwardPointsRequest
from models import MenuItem, MenuItemCreate, MenuItemOption, MenuItemOptionCreate, MenuItemTag, MenuItemTagCreate
from models_client import Cliente, ClienteCreate, ClienteUpdate
from models_client import Address, AddressCreate, AddressUpdate
from models_client import OTPRequest, OTPVerify, ClientTokenResponse

# Supabase connection
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

import mercadopago

# --- CONFIG ---
SECRET_KEY = os.environ.get("JWT_SECRET", "secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # 30 days
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 30

# --- AI CREDIT CONFIG ---
# --- PLAN CONFIG ---
PLAN_CONFIG = {
    "trial": {
        "img": 10,
        "nutri": 10,
        "desc": 10,
        "wa": 10,
        "campaign": 0,
        "hub": 0
    },
    "basic": {
        "img": 50,
        "nutri": 50,
        "desc": 50,
        "wa": 500,
        "campaign": 0,
        "hub": 0
    },
    "pro": {
        "img": 120,
        "nutri": 120,
        "desc": 120,
        "wa": 1500,
        "campaign": 0,
        "hub": 0
    },
    "premium": {
        "img": 300,
        "nutri": 300,
        "desc": 300,
        "wa": 3000,
        "campaign": 50,
        "hub": 10
    },
    "free": {
        "img": 5,
        "nutri": 5,
        "desc": 5,
        "wa": 5,
        "campaign": 0,
        "hub": 0
    }
}

# Initialize MercadoPago SDK
mp_access_token = os.environ.get("MERCADOPAGO_ACCESS_TOKEN")
if not mp_access_token:
    logger.warning("MERCADOPAGO_ACCESS_TOKEN not found in environment variables. MercadoPago features will be disabled.")
    # Initialize with a dummy string to avoid ValueError if the SDK is called, 
    # but we should handle this in the payment routes too.
    mp_sdk = mercadopago.SDK("MISSING_TOKEN")
else:
    mp_sdk = mercadopago.SDK(mp_access_token)

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Menu.IA API", version="1.0.0")

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Menu.IA API is running"}

# Configure CORS based on environment variables
cors_origins_str = os.environ.get("CORS_ORIGINS", "")
if cors_origins_str:
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]
else:
    # Fallback to hardcoded list if env var is missing
    cors_origins = [
        "https://menuia.co",
        "https://www.menuia.co",
        "https://menuia-production.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"] # Ensure all headers are exposed
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info(f"Allowed CORS origins: {cors_origins}")


# WebSocket Manager for Real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, negocio_id: str):
        await websocket.accept()
        if negocio_id not in self.active_connections:
            self.active_connections[negocio_id] = []
        self.active_connections[negocio_id].append(websocket)
        logger.info(f"WebSocket connected for business: {negocio_id}")

    def disconnect(self, websocket: WebSocket, negocio_id: str):
        if negocio_id in self.active_connections:
            if websocket in self.active_connections[negocio_id]:
                self.active_connections[negocio_id].remove(websocket)
            logger.info(f"WebSocket disconnected for business: {negocio_id}")

    async def broadcast(self, negocio_id: str, message: dict):
        if negocio_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[negocio_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, negocio_id)


manager = ConnectionManager()


@api_router.websocket("/ws/{negocio_id}")
async def websocket_endpoint(websocket: WebSocket, negocio_id: str):
    await manager.connect(websocket, negocio_id)
    try:
        while True:
            # Keep connection alive and listen for any client messages
            # For now we just echo or ignore, but it keeps the loop running
            data = await websocket.receive_text()
            # logger.info(f"Client {negocio_id} sent: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, negocio_id)




# --- AI Nutrition Estimation ---
async def estimate_nutrition(product_name: str, description: str = ""):
    try:
        # Use existing genai configuration or re-configure if env key is present
        api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            return None
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        
        prompt = f"""
        Como un experto nutricionista, estima la información nutricional aproximada para el siguiente plato de un restaurante. 
        Devuelve SOLO un objeto JSON con los campos exactos: "kcal" (número entero), "proteina" (string con 'g'), "carbohidratos" (string con 'g'), "grasa" (string con 'g').
        
        Plato: {product_name}
        Descripción: {description}
        
        Ejemplo de salida: {{"kcal": 450, "proteina": "25g", "carbohidratos": "40g", "grasa": "15g"}}
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean potential markdown formatting
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '{' in text:
             text = text[text.find('{'):text.rfind('}')+1]
             
        data = json.loads(text)
        return data
    except Exception as e:
        logger.warning(f"Error estimating nutrition for {product_name}: {e}")
        return None


# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def deduct_ai_credit(business_id: str, credit_type: str, current_business: Business):
    """
    credit_type: 'desc', 'img', 'nutri'
    """
    plan = (current_business.plan or "free").lower()
    if plan not in PLAN_CONFIG:
        plan = "free"
        
    plan_limits = PLAN_CONFIG[plan]
    limit = plan_limits.get(credit_type, 5)
    
    field_name = f"ai_credits_{credit_type}_used"
    used = getattr(current_business, field_name)
    
    if used >= limit:
        raise HTTPException(
            status_code=403, 
            detail=f"Has agotado tus créditos de IA para {credit_type}. Límite del plan ({plan}): {limit}."
        )
    
    # Deduct (increment used count)
    new_used = used + 1
    try:
        supabase.table('negocios').update({field_name: new_used}).eq('id', business_id).execute()
    except Exception as e:
        logger.error(f"Error deducting AI credit ({credit_type}) for {business_id}: {e}")


async def get_current_business(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Business:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        business_id = payload.get("sub")
        if not business_id:
            logger.error("Token missing 'sub' claim")
            raise HTTPException(status_code=401, detail="Token inválido")
        
        response = supabase.table('negocios').select('*').eq('id', business_id).execute()
        if not response.data:
            logger.error(f"Business not found for ID: {business_id}")
            raise HTTPException(status_code=401, detail="Negocio no encontrado")
        
        business_doc = response.data[0]
        current_plan = business_doc.get('plan', 'trial')
        plan_expires_at = business_doc.get('plan_expires_at')
        
        # TRIAL LOCKOUT ENFORCEMENT
        if current_plan == 'trial':
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            
            # 1. Date Check
            if plan_expires_at:
                try:
                    expires_dt = datetime.fromisoformat(plan_expires_at.replace('Z', '+00:00'))
                    if expires_dt < now:
                        logger.warning(f"Trial expired for {business_id}: {plan_expires_at}")
                        raise HTTPException(
                            status_code=403, 
                            detail="Tu periodo de prueba de 7 días ha terminado. Por favor, comunícate con soporte o adquiere un plan para continuar."
                        )
                except (ValueError, TypeError) as e:
                    logger.error(f"Error parsing plan_expires_at: {e}")

            # 2. Credits Check (Hard stop if ANY limit reached in trial)
            trial_limits = PLAN_CONFIG['trial']
            used_img = business_doc.get('ai_credits_img_used', 0)
            used_nutri = business_doc.get('ai_credits_nutri_used', 0)
            used_desc = business_doc.get('ai_credits_desc_used', 0)
            used_wa = business_doc.get('ai_credits_wa_used', 0)
            
            if (used_img >= trial_limits['img'] or 
                used_nutri >= trial_limits['nutri'] or 
                used_desc >= trial_limits['desc'] or 
                used_wa >= trial_limits['wa']):
                
                logger.warning(f"Trial limits reached for {business_id}")
                raise HTTPException(
                    status_code=403, 
                    detail="Has agotado tus créditos de prueba gratuitos. Todas las funciones están inhabilitadas hasta que adquieras un plan."
                )

        # PLAN EXPIRATION CHECK (Non-trial)
        elif plan_expires_at:
            from datetime import datetime, timezone
            try:
                # Handle ISO format strings from Supabase
                expires_dt = datetime.fromisoformat(plan_expires_at.replace('Z', '+00:00'))
                if expires_dt < datetime.now(timezone.utc):
                    logger.info(f"Plan for business {business_id} has expired ({plan_expires_at}). Downgrading to trial.")
                    # Update DB
                    seven_days_later = datetime.now(timezone.utc) + timedelta(days=7)
                    supabase.table('negocios').update({
                        'plan': 'trial',
                        'plan_expires_at': seven_days_later.isoformat()
                    }).eq('id', business_id).execute()
                    # Update local object
                    business_doc['plan'] = 'trial'
                    business_doc['plan_expires_at'] = seven_days_later.isoformat()
            except Exception as exp_err:
                logger.error(f"Error checking plan expiration: {exp_err}")

        # AI CREDITS RESET CHECK (30 DAYS)
        from datetime import datetime, timezone
        last_reset = business_doc.get('ai_credits_last_reset')
        needs_reset = False
        now = datetime.now(timezone.utc)
        
        if not last_reset:
            needs_reset = True
        else:
            try:
                # Handle possible string or already datetime types
                if isinstance(last_reset, str):
                    last_reset_dt = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
                else:
                    last_reset_dt = last_reset
                    
                if (now - last_reset_dt).days >= 30:
                    needs_reset = True
            except Exception as e:
                logger.warning(f"Error parsing last_reset date: {e}")
                needs_reset = True
                
        if needs_reset:
            logger.info(f"Resetting AI credits for business {business_id}")
            update_data = {
                'ai_credits_desc_used': 0,
                'ai_credits_img_used': 0,
                'ai_credits_nutri_used': 0,
                'ai_credits_last_reset': now.isoformat()
            }
            try:
                supabase.table('negocios').update(update_data).eq('id', business_id).execute()
            except Exception as e:
                logger.error(f"Fallo al actualizar créditos de IA en DB: {e}")
                
            # Update local doc for the current request
            business_doc.update(update_data)

        if 'password_hash' in business_doc:
            del business_doc['password_hash']
            
        try:
            return Business(**business_doc)
        except Exception as e:
            logger.error(f"Error parsing Business model: {e}")
            logger.error(f"Data: {business_doc}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Error interno al procesar datos del negocio")

    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Token inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in auth: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno de autenticación")


async def get_current_employee(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Employee:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        employee_id = payload.get("sub")
        employee_type = payload.get("type")
        
        if not employee_id or employee_type != "employee":
            raise HTTPException(status_code=401, detail="Token de empleado inválido")
        
        response = supabase.table('empleados').select('*').eq('id', employee_id).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="Empleado no encontrado")
        
        employee_doc = response.data[0]
        return Employee(**employee_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def get_current_client(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Cliente:
    token = credentials.credentials
    try:
        # Check payload first
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone = payload.get("sub")
        role = payload.get("role")
        
        if not phone or role != "client":
            # Continue to next handler if needed or raise specific error
            # But here this is the only client auth dependency
            raise HTTPException(status_code=401, detail="Credenciales de cliente inválidas")

        response = supabase.table('clientes').select('*').eq('telefono', phone).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="Cliente no encontrado")
            
        return Cliente(**response.data[0])
        
    except jwt.PyJWTError as e:
        logger.error(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Token de cliente inválido o expirado")
    except Exception as e:
        logger.error(f"Error validating client token: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno validando sesión: {str(e)}")


def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_doc(doc: dict) -> dict:
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue
        result[key] = serialize_datetime(value)
    return result


def format_order_summary_wa(business_name: str, order: Order) -> str:
    fecha = datetime.now().strftime("%d/%m/%Y, %H:%M:%S")
    
    items_text = ""
    subtotal_items = 0
    for i, item in enumerate(order.items, 1):
        item_subtotal = item.cantidad * item.precio_unitario
        subtotal_items += item_subtotal
        items_text += f"{i}. {item.nombre}\n"
        if item.modificadores:
            mods = []
            for m in item.modificadores:
                if isinstance(m, dict):
                    name = m.get('nombre', '')
                    price = m.get('precio', 0)
                    if price and price > 0:
                        mods.append(f"{name} (+${price:,.0f})")
                    else:
                        mods.append(name)
                else:
                    mods.append(str(m))
            items_text += f"   Opciones/Adicionales: {', '.join(mods)}\n"
        if item.notas and item.notas != "No aplica":
            items_text += f"   Nota: {item.notas}\n"
        items_text += f"   Cantidad: {item.cantidad}\n"
        items_text += f"   Precio: ${item.precio_unitario:,.0f}\n"
        items_text += f"   Subtotal: ${item_subtotal:,.0f}\n\n"
    
    delivery_info = ""
    if order.tipo == "delivery":
        delivery_info = f"🛵 *Entrega a Domicilio*\n"
        delivery_info += f"📍 Dirección: {order.direccion or 'No especificada'}\n"
        if order.distancia:
            delivery_info += f"📏 Distancia: {order.distancia:.1f} km\n"
        if order.costo_envio:
            delivery_info += f"💰 Costo de envío: ${order.costo_envio:,.2f}\n"
        delivery_info += "\n"
    
    # Random food emoji
    import random
    emojis = ["🍔", "🍕", "🥤", "🌮", "🥘", "🥗", "🍣", "🍦", "🍪", "☕️", "🍗", "🥟"]
    emoji = random.choice(emojis)

    summary = (
        f"🔔 *Nuevo Pedido - {business_name}*\n\n"
        f"🆔 *ID del Pedido:* {order.id[:8].upper()}\n\n"
        f"👤 *Datos del Cliente*\n"
        f"Nombre: {order.cliente_nombre or 'Usuario'}\n"
        f"Teléfono: {order.cliente_telefono or 'N/A'}\n\n"
        f"🛒 *Detalle del Pedido*\n"
        f"{items_text}"
        f"{delivery_info}"
        f"💳 *Resumen de Pago*\n"
        f"Subtotal productos: ${subtotal_items:,.2f}\n"
        f"Costo de envío: ${order.costo_envio or 0:,.2f}\n"
        f"💰 *TOTAL: ${order.total:,.2f}*\n\n"
        f"💵 Método de Pago: {order.metodo_pago or 'Efectivo'}\n"
        f"🚚 Método de Entrega: {order.metodo_entrega or order.tipo}\n\n"
        f"⏰ Pedido realizado: {fecha}\n\n"
        f"¡Gracias por tu pedido! {emoji}"
    )
    return summary


# ============ HEALTH CHECK ============
@api_router.get("/")
async def root():
    return {"message": "Menu.IA API v1.0", "status": "running"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ============ AUTH ROUTES ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register_business(data: BusinessCreate):
    try:
        # Check if email exists
        response = supabase.table('negocios').select('id').eq('email', data.email).execute()
        if response.data:
            raise HTTPException(status_code=400, detail="Email ya registrado")
        
        # Check if slug exists
        response = supabase.table('negocios').select('id').eq('slug', data.slug).execute()
        if response.data:
            raise HTTPException(status_code=400, detail="Slug ya en uso")
        
        # Create business
        business = Business(
            nombre=data.nombre,
            slug=data.slug,
            descripcion=data.descripcion,
            slogan=data.slogan,
            direccion=data.direccion,
            telefono=data.telefono,
            whatsapp=data.whatsapp,
            horarios=data.horarios,
            logo_url=data.logo_url,
            banner_url=data.banner_url,
            email=data.email,
            plan="trial",
            plan_expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        # Store with password hash
        business_dict = serialize_doc(business.model_dump())
        business_dict['password_hash'] = hash_password(data.password)
        
        # Remove fields not in DB schema to prevent errors
        try:
             cols_res = supabase.table('negocios').select('*').limit(1).execute()
             db_cols = cols_res.data[0].keys() if cols_res.data else []
        except:
             db_cols = []
             
        # Fallback if we can't get columns easily - but we know the core ones
        core_cols = ['id', 'nombre', 'slug', 'slogan', 'descripcion', 'direccion', 'telefono', 'whatsapp', 'horarios', 'logo_url', 'banner_url', 'email', 'password_hash']
        
        target_cols = set(list(db_cols) + core_cols)
        
        filtered_dict = {k: v for k, v in business_dict.items() if (k in target_cols or not target_cols) and v is not None}
        
        # Explicitly remove known problematic fields if they leak
        for field in ['is_active', 'plan', 'subscription_plan', 'ai_use_modal']:
            if field in filtered_dict and field not in db_cols:
                del filtered_dict[field]

        # Insert into Supabase
        logger.info(f"Insertando negocio: {filtered_dict}")
        insert_response = supabase.table('negocios').insert(filtered_dict).execute()
        logger.info(f"Respuesta Supabase: {insert_response}")

        # Create token
        token = create_token({"sub": business.id, "type": "business"})
        
        return TokenResponse(
            access_token=token,
            business=BusinessPublic(**business.model_dump())
        )
    except Exception as e:
        logger.error(f"Error en registro: {str(e)}")
        # Check for Supabase specific errors if possible
        if hasattr(e, 'message'):
             logger.error(f"Detalle error: {e.message}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@api_router.post("/auth/login", response_model=TokenResponse)
async def login_business(data: BusinessLogin):
    logger.info(f"Login attempt for email: {data.email}")
    response = supabase.table('negocios').select('*').eq('email', data.email).execute()
    if not response.data:
        logger.warning(f"Login failed: User {data.email} not found")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    business_doc = response.data[0]
    if not verify_password(data.password, business_doc.get('password_hash', '')):
        logger.warning(f"Login failed: Incorrect password for {data.email}")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if 'password_hash' in business_doc:
        del business_doc['password_hash']
        
    business = Business(**business_doc)
    token = create_token({"sub": business.id, "type": "business"})
    
    return TokenResponse(
        access_token=token,
        business=BusinessPublic(**business.model_dump())
    )


@api_router.get("/auth/me", response_model=BusinessPublic)
async def get_current_business_info(business: Business = Depends(get_current_business)):
    return BusinessPublic(**business.model_dump())


# ============ EMPLOYEE AUTH ============
@api_router.post("/employee/login/{slug}", response_model=EmployeeTokenResponse)
async def login_employee(slug: str, data: EmployeeLogin):
    # Find business by slug
    response = supabase.table('negocios').select('*').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_doc = response.data[0]
    
    # Find employee by PIN
    response = supabase.table('empleados').select('*').match({
        "negocio_id": business_doc['id'],
        "pin": data.pin,
        "activo": True
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=401, detail="PIN inválido")
    
    employee_doc = response.data[0]
    employee = Employee(**employee_doc)
    token = create_token({"sub": employee.id, "type": "employee", "negocio_id": business_doc['id']})
    
    return EmployeeTokenResponse(access_token=token, employee=employee)


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    try:
        # Usar el servicio nativo de Supabase Auth
        # Esto enviará automáticamente el correo desde Supabase
        supabase.auth.reset_password_for_email(data.email)
        
        logger.info(f"Correo de recuperación solicitado para: {data.email} vía Supabase Auth")
        
        return {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}
    except Exception as e:
        logger.error(f"Error al solicitar recuperación en Supabase: {e}")
        # Por seguridad, devolvemos el mismo mensaje aunque falle (si el usuario no existe)
        return {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    # Verify token
    res = supabase.table('password_reset_tokens').select('*').eq('token', data.token).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    token_doc = res.data[0]
    expires_at = datetime.fromisoformat(token_doc['expires_at'].replace('Z', '+00:00'))
    
    if expires_at < datetime.now(timezone.utc):
        supabase.table('password_reset_tokens').delete().eq('token', data.token).execute()
        raise HTTPException(status_code=400, detail="Token expirado")
    
    # Update password
    new_hash = hash_password(data.new_password)
    supabase.table('negocios').update({"password_hash": new_hash}).eq('email', token_doc['email']).execute()
    
    # Delete token
    supabase.table('password_reset_tokens').delete().eq('token', data.token).execute()
    
    return {"message": "Contraseña actualizada con éxito"}


@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, business: Business = Depends(get_current_business)):
    # Verify old password
    # We need the hash from DB because the 'business' object from Depends doesn't have it
    res = supabase.table('negocios').select('password_hash').eq('id', business.id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    curr_hash = res.data[0]['password_hash']
    if not verify_password(data.old_password, curr_hash):
        raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")
    
    # Update to new password
    new_hash = hash_password(data.new_password)
    supabase.table('negocios').update({"password_hash": new_hash}).eq('id', business.id).execute()
    
    return {"message": "Contraseña actualizada correctamente"}


@api_router.post("/client/change-password")
async def client_change_password(data: ChangePasswordRequest, client: Cliente = Depends(get_current_client)):
    # If they have a password_hash, verify it. If not (first time setting), allow it?
    # Actually, if old_password is provided in model, we use it.
    res = supabase.table('clientes').select('password_hash').eq('id', client.id).execute()
    curr_hash = res.data[0].get('password_hash') if res.data else None
    
    if curr_hash and data.old_password:
        if not verify_password(data.old_password, curr_hash):
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")
    elif curr_hash and not data.old_password:
        raise HTTPException(status_code=401, detail="Se requiere la contraseña actual")
        
    # Update to new password
    new_hash = hash_password(data.new_password)
    supabase.table('clientes').update({
        "password_hash": new_hash,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq('id', client.id).execute()
    
    return {"message": "Contraseña actualizada correctamente"}


# ============ BUSINESS ROUTES ============
@api_router.get("/business/{slug}", response_model=BusinessPublic)
async def get_business_by_slug(slug: str):
    # Normalize slug
    slug = slug.lower().strip().rstrip('/')
    response = supabase.table('negocios').select('*').match({"slug": slug}).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    business_doc = response.data[0]
    
    # TRIAL LOCKOUT CHECK
    current_plan = business_doc.get('plan', 'trial')
    if current_plan == 'trial':
        from datetime import datetime, timezone
        plan_expires_at = business_doc.get('plan_expires_at')
        now = datetime.now(timezone.utc)
        
        # 1. Date Check
        if plan_expires_at:
            try:
                expires_dt = datetime.fromisoformat(plan_expires_at.replace('Z', '+00:00'))
                if expires_dt < now:
                    raise HTTPException(status_code=403, detail="Este menú no está disponible por el momento (periodo de prueba finalizado).")
            except: pass

        # 2. Credits Check
        trial_limits = PLAN_CONFIG['trial']
        if (business_doc.get('ai_credits_img_used', 0) >= trial_limits['img'] or 
            business_doc.get('ai_credits_nutri_used', 0) >= trial_limits['nutri'] or 
            business_doc.get('ai_credits_desc_used', 0) >= trial_limits['desc'] or 
            business_doc.get('ai_credits_wa_used', 0) >= trial_limits['wa']):
            raise HTTPException(status_code=403, detail="Este menú no está disponible por el momento (limite de prueba alcanzado).")

    if 'password_hash' in business_doc:
        del business_doc['password_hash']
        
    return BusinessPublic(**business_doc)


@api_router.put("/business/{slug}", response_model=BusinessPublic)
async def update_business(slug: str, data: Dict[str, Any], business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Filter data to only allowed fields
    allowed_fields = [
        'nombre', 'descripcion', 'slogan', 'direccion', 'telefono', 
        'whatsapp', 'horarios', 'logo_url', 'banner_url',
        'banner_tag', 'banner_title', 'banner_description',
        'precio_km', 'costo_minimo_domicilio', 'lat', 'lng',
        'metodos_pago', 'metodos_entrega',
        'ai_habilitado', 'ai_personalidad', 'ai_saludo', 'ai_conocimiento',
        'ai_use_modal', 'twilio_sid', 'twilio_token', 'twilio_number', 'abierto'
    ]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    response = supabase.table('negocios').update(update_data).eq('id', business.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Error al actualizar")
    
    return BusinessPublic(**response.data[0])


@api_router.get("/business/{slug}/analytics", response_model=BusinessAnalytics)
async def get_business_analytics(slug: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get today's orders
    response = supabase.table('pedidos').select('*').match({"negocio_id": business.id}).gte("created_at", today_start.isoformat()).execute()
    today_orders = response.data
    
    ventas_hoy = sum(float(o.get('total', 0)) for o in today_orders)
    pedidos_hoy = len(today_orders)
    pedidos_activos = len([o for o in today_orders if o.get('estado') in ['pendiente', 'preparando']])
    domicilios_hoy = len([o for o in today_orders if o.get('tipo_pedido') in ['domicilio', 'delivery']])
    
    # Clientes nuevos hoy
    response = supabase.table('clientes_puntos').select('id').match({"negocio_id": business.id}).gte("created_at", today_start.isoformat()).execute()
    clientes_nuevos_hoy = len(response.data) if response.data else 0
    
    # Puntos otorgados hoy
    clients_res = supabase.table('clientes_puntos').select('id').eq('negocio_id', business.id).execute()
    client_ids = [c['id'] for c in clients_res.data] if clients_res.data else []
    puntos_otorgados_hoy = 0
    if client_ids:
        points_res = supabase.table('transacciones_puntos').select('puntos').match({"tipo": "ganado"}).in_('cliente_puntos_id', client_ids).gte("created_at", today_start.isoformat()).execute()
        puntos_otorgados_hoy = sum(int(p.get('puntos', 0)) for p in points_res.data) if points_res.data else 0

    # Mensajes enviados (Total count from business profile)
    mensajes_enviados_hoy = business.wa_messages_count
    
    # Get tables
    response = supabase.table('mesas').select('*').eq("negocio_id", business.id).execute()
    tables = response.data
    mesas_ocupadas = len([t for t in tables if t.get('estado') != 'libre'])
    mesas_totales = len(tables)
    
    # Get unavailable products
    response = supabase.table('productos').select('id', count='exact').match({
        "negocio_id": business.id,
        "disponible": False
    }).execute()
    productos_agotados = response.count if response.count is not None else 0
    
    # Get last 7 days stats
    ultimos_7_dias = []
    for i in range(7):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        
        response = supabase.table('pedidos').select('*').match({"negocio_id": business.id}).gte("created_at", day.isoformat()).lt("created_at", day_end.isoformat()).execute()
        day_orders = response.data
        
        ultimos_7_dias.append(DailyStats(
            fecha=day.strftime("%Y-%m-%d"),
            total_pedidos=len(day_orders),
            total_ventas=sum(float(o.get('total', 0)) for o in day_orders),
            pedidos_completados=len([o for o in day_orders if o.get('estado') == 'entregado']),
            pedidos_cancelados=len([o for o in day_orders if o.get('estado') == 'cancelado'])
        ))
    
    return BusinessAnalytics(
        ventas_hoy=ventas_hoy,
        pedidos_hoy=pedidos_hoy,
        pedidos_activos=pedidos_activos,
        mesas_ocupadas=mesas_ocupadas,
        mesas_totales=mesas_totales,
        productos_agotados=productos_agotados,
        clientes_nuevos_hoy=clientes_nuevos_hoy,
        puntos_otorgados_hoy=puntos_otorgados_hoy,
        mensajes_enviados_hoy=mensajes_enviados_hoy,
        domicilios_hoy=domicilios_hoy,
        ultimos_7_dias=ultimos_7_dias
    )


# ============ UPLOAD ROUTES ============
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), business: Business = Depends(get_current_business)):
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
            
        # Create a unique filename with business context
        file_ext = file.filename.split('.')[-1]
        file_name = f"{business.id}/{uuid.uuid4()}.{file_ext}"
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Supabase Storage
        # Note: bucket 'menupro' was pre-created as public
        res = supabase.storage.from_('menupro').upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_('menupro').get_public_url(file_name)
        
        return {"url": public_url}
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {str(e)}")


# ============ PRODUCTS ROUTES ============
@api_router.get("/products/{slug}", response_model=List[Product])
async def get_products(slug: str, categoria: Optional[str] = None):
    # Normalize slug
    slug = slug.lower().strip().rstrip('/')
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    query = supabase.table('productos').select('*').eq('negocio_id', business_id).order('orden')
    if categoria:
        query = query.eq('categoria', categoria)
    
    try:
        response = query.execute()
        products = response.data
        return [Product(**p) for p in products]
    except Exception as e:
        logger.error(f"Error getting products: {str(e)}")
        # Log traceback if possible, but at least detailed message
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener productos: {str(e)}")


@api_router.post("/products/{slug}", response_model=Product)
async def create_product(slug: str, data: ProductCreate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    product = Product(
        **data.model_dump(),
        negocio_id=business.id
    )

    # Estimate nutrition if not provided
    if not any([product.nutri_kcal, product.nutri_proteina, product.nutri_carbohidratos, product.nutri_grasa]):
        try:
            deduct_ai_credit(business.id, 'nutri', business)
            nutrition = await estimate_nutrition(product.nombre, product.descripcion or "")
            if nutrition:
                product.nutri_kcal = nutrition.get('kcal')
                product.nutri_proteina = nutrition.get('proteina')
                product.nutri_carbohidratos = nutrition.get('carbohidratos')
                product.nutri_grasa = nutrition.get('grasa')
        except HTTPException:
            logger.info(f"Skipping auto-nutrition for {slug} due to no credits or limit reached")
        except Exception as e:
            logger.error(f"Error in auto-nutrition: {e}")
    
    try:
        data_dict = serialize_doc(product.model_dump())
        res = supabase.table('productos').insert(data_dict).execute()
        return product
    except Exception as e:
        error_str = str(e)
        logger.warning(f"Error creating product, attempting to handle missing columns: {error_str}")
        
        # Handle missing columns gracefully
        new_columns = [
            'destacado', 'oferta_porcentaje', 'precio_original', 'etiqueta', 
            'prep_time_minutes', 'nutri_kcal', 'nutri_proteina', 
            'nutri_carbohidratos', 'nutri_grasa', 'modificadores'
        ]
        
        # If it's a column missing error, try to remove all potentially missing columns that are in the error message
        if "column" in error_str.lower():
            for col in new_columns:
                if col in error_str.lower():
                    logger.warning(f"Removing missing column '{col}' from insert payload.")
                    data_dict.pop(col, None)
            
            try:
                # Retry without the missing columns
                res = supabase.table('productos').insert(data_dict).execute()
                # Update the product object to reflect what was actually saved
                for col in new_columns:
                    if col not in data_dict:
                        setattr(product, col, None if col != 'destacado' else False)
                return product
            except Exception as e2:
                # If it still fails, check if ANOTHER column from our list is missing
                error_str2 = str(e2)
                if "column" in error_str2.lower():
                    for col in new_columns:
                        if col in error_str2.lower():
                            logger.warning(f"Removing another missing column '{col}' from insert payload.")
                            data_dict.pop(col, None)
                    
                    try:
                        res = supabase.table('productos').insert(data_dict).execute()
                        for col in new_columns:
                            if col not in data_dict:
                                setattr(product, col, None if col != 'destacado' else False)
                        return product
                    except Exception as e3:
                        logger.error(f"Error on second retry: {str(e3)}")
                        raise HTTPException(status_code=500, detail=f"Error al crear producto (múltiples columnas faltantes): {str(e3)}")

        logger.error(f"Error creating product: {error_str}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {error_str}")


@api_router.put("/products/{slug}/{product_id}", response_model=Product)
async def update_product(slug: str, product_id: str, data: ProductUpdate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    # If name or description changed, and no nutrition info provided in update, re-estimate?
    # We only re-estimate if the name or description is updated AND no nutritional data is explicitly sent in this update.
    has_name_change = 'nombre' in update_data or 'descripcion' in update_data
    has_nutri_input = any(k in update_data for k in ['nutri_kcal', 'nutri_proteina', 'nutri_carbohidratos', 'nutri_grasa'])
    
    if has_name_change and not has_nutri_input:
        # Get current data to have full context for estimation
        curr_res = supabase.table('productos').select('nombre, descripcion').eq('id', product_id).execute()
        if curr_res.data:
            current = curr_res.data[0]
            new_name = update_data.get('nombre', current.get('nombre'))
            new_desc = update_data.get('descripcion', current.get('descripcion'))
            
            try:
                deduct_ai_credit(business.id, 'nutri', business)
                nutrition = await estimate_nutrition(new_name, new_desc or "")
                if nutrition:
                    update_data['nutri_kcal'] = nutrition.get('kcal')
                    update_data['nutri_proteina'] = nutrition.get('proteina')
                    update_data['nutri_carbohidratos'] = nutrition.get('carbohidratos')
                    update_data['nutri_grasa'] = nutrition.get('grasa')
                    logger.info(f"Re-estimated nutrition for updated product {product_id}")
            except HTTPException:
                logger.info(f"Skipping re-estimation for {product_id} due to no credits")
            except Exception as e:
                logger.error(f"Error in re-estimation: {e}")
    
    try:
        response = supabase.table('productos').update(update_data).match({
            "id": product_id, 
            "negocio_id": business.id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        return Product(**response.data[0])
    except Exception as e:
        logger.error(f"Error updating product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar producto: {str(e)}")


@api_router.delete("/products/{slug}/{product_id}")
async def delete_product(slug: str, product_id: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    response = supabase.table('productos').delete().match({
        "id": product_id, 
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"message": "Producto eliminado"}


# ============ PREMIUM MENU ROUTES ============
@api_router.get("/menu-items/{slug}", response_model=List[MenuItem])
async def get_menu_items(slug: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('menu_items').select('*').eq('negocio_id', business_id).order('created_at', desc=True).execute()
    return [MenuItem(**item) for item in response.data]


@api_router.post("/menu-items/{slug}", response_model=MenuItem)
async def create_menu_item(slug: str, data: MenuItemCreate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    dump_data = data.model_dump()
    dump_data['negocio_id'] = business.id
    item = MenuItem(**dump_data)
    data_dict = serialize_doc(item.model_dump())
    
    try:
        response = supabase.table('menu_items').insert(data_dict).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Error al crear el plato")
        return MenuItem(**response.data[0])
    except Exception as e:
        logger.error(f"Error creating menu item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear plato: {str(e)}")


@api_router.put("/menu-items/{slug}/{item_id}", response_model=MenuItem)
async def update_menu_item(slug: str, item_id: str, data: Dict[str, Any], business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    update_data = {k: v for k, v in data.items() if k != 'id'}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    try:
        response = supabase.table('menu_items').update(update_data).match({
            "id": item_id,
            "negocio_id": business.id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Plato no encontrado")
        
        return MenuItem(**response.data[0])
    except Exception as e:
        logger.error(f"Error updating menu item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar plato: {str(e)}")


@api_router.delete("/menu-items/{slug}/{item_id}")
async def delete_menu_item(slug: str, item_id: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    response = supabase.table('menu_items').delete().match({
        "id": item_id,
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    
    return {"message": "Plato eliminado"}


# --- Options ---
@api_router.get("/menu-items/{item_id}/options", response_model=List[MenuItemOption])
async def get_menu_item_options(item_id: str):
    response = supabase.table('menu_item_options').select('*').eq('menu_item_id', item_id).execute()
    return [MenuItemOption(**opt) for opt in response.data]


@api_router.post("/menu-items/{item_id}/options", response_model=MenuItemOption)
async def create_menu_item_option(item_id: str, data: MenuItemOptionCreate, business: Business = Depends(get_current_business)):
    # Verify item belongs to business
    item_res = supabase.table('menu_items').select('negocio_id').eq('id', item_id).execute()
    if not item_res.data or item_res.data[0]['negocio_id'] != business.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    option = MenuItemOption(**data.model_dump(), menu_item_id=item_id)
    response = supabase.table('menu_item_options').insert(serialize_doc(option.model_dump())).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Error al crear la opción")
    
    return MenuItemOption(**response.data[0])


@api_router.delete("/menu-items/options/{option_id}")
async def delete_menu_item_option(option_id: str, business: Business = Depends(get_current_business)):
    # In a real app we'd verify ownership via join
    # For now, let's just delete
    response = supabase.table('menu_item_options').delete().eq('id', option_id).execute()
    return {"message": "Opción eliminada"}


# --- Tags ---
@api_router.get("/menu-items/{item_id}/tags", response_model=List[MenuItemTag])
async def get_menu_item_tags(item_id: str):
    response = supabase.table('menu_item_tags').select('*').eq('menu_item_id', item_id).execute()
    return [MenuItemTag(**tag) for tag in response.data]


@api_router.post("/menu-items/{item_id}/tags", response_model=MenuItemTag)
async def create_menu_item_tag(item_id: str, data: MenuItemTagCreate, business: Business = Depends(get_current_business)):
    item_res = supabase.table('menu_items').select('negocio_id').eq('id', item_id).execute()
    if not item_res.data or item_res.data[0]['negocio_id'] != business.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    tag = MenuItemTag(**data.model_dump(), menu_item_id=item_id)
    response = supabase.table('menu_item_tags').insert(serialize_doc(tag.model_dump())).execute()
    
    return MenuItemTag(**response.data[0])


# ============ CATEGORIES ROUTES ============
@api_router.get("/categories/{slug}")
async def get_categories(slug: str):
    # Normalize slug
    slug = slug.lower().strip().rstrip('/')
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # Try to get from 'categorias' table first
    try:
        res_cats = supabase.table('categorias').select('nombre, icono').eq('negocio_id', business_id).order('orden').execute()
        if res_cats.data:
            return [{"nombre": c["nombre"], "icono": c.get("icono")} for c in res_cats.data]
    except Exception as e:
        logger.warning(f"Error fetching categories from table: {e}")
        pass # Table might not exist yet

    # Fallback: distinct from products
    response = supabase.table('productos').select('categoria').eq('negocio_id', business_id).execute()
    categories = sorted(list(set(p['categoria'] for p in response.data if p.get('categoria'))))
    # Return as objects for consistency
    return [{"nombre": c, "icono": None} for c in categories]

@api_router.post("/categories/{slug}")
async def create_category(slug: str, data: Dict[str, str], business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    nombre = data.get("nombre")
    icono = data.get("icono")
    
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
        
    try:
        # Check if exists
        logger.info(f"Checking for category: {nombre} in business {business.id}")
        res = supabase.table('categorias').select('id, nombre, icono').match({"negocio_id": business.id, "nombre": nombre}).execute()
        
        if not res.data:
            logger.info(f"Category not found, creating new: {nombre}, icon: {icono}")
            payload = {"negocio_id": business.id, "nombre": nombre}
            if icono:
                payload["icono"] = icono
            supabase.table('categorias').insert(payload).execute()
        else:
            cat_id = res.data[0]['id']
            curr_icon = res.data[0].get('icono')
            logger.info(f"Category found: {cat_id}, current icon: {curr_icon}. Updating to: {icono}")
            # Update icon if provided
            if icono:
                supabase.table('categorias').update({"icono": icono}).eq("id", cat_id).execute()
                logger.info("Icon updated.")

    except Exception as e:
        logger.error(f"Error saving category: {e}")
        error_msg = str(e)
        if "column" in error_msg.lower() and "icono" in error_msg.lower():
             logger.error("CRITICAL: 'icono' column missing in 'categorias' table. Please run: ALTER TABLE categories ADD COLUMN IF NOT EXISTS icono TEXT;")
        # If table doesn't exist, ignore (frontend will rely on product saving)
        pass
        
    return {"message": "Categoría guardada"}

@api_router.delete("/categories/{slug}")
async def delete_category(slug: str, nombre: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    try:
        supabase.table('categorias').delete().match({"negocio_id": business.id, "nombre": nombre}).execute()
    except:
        pass
    return {"message": "Categoría eliminada"}


# ============ TAGS ROUTES ============
@api_router.get("/tags/{slug}")
async def get_tags(slug: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # Try to get from 'etiquetas' table first
    try:
        res_tags = supabase.table('etiquetas').select('nombre').eq('negocio_id', business_id).execute()
        if res_tags.data:
            return [t['nombre'] for t in res_tags.data]
    except:
        pass

    # Fallback
    # Safe get: select all columns and use .get() to avoid crash if column is missing
    try:
        response = supabase.table('productos').select('*').eq('negocio_id', business_id).execute()
        tags = sorted(list(set(p['etiqueta'] for p in response.data if p.get('etiqueta'))))
        return tags
    except:
        return []

@api_router.post("/tags/{slug}")
async def create_tag(slug: str, data: Dict[str, str], business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    nombre = data.get("nombre")
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
        
    try:
        # Check if exists
        res = supabase.table('etiquetas').select('id').match({"negocio_id": business.id, "nombre": nombre}).execute()
        if not res.data:
            supabase.table('etiquetas').insert({"negocio_id": business.id, "nombre": nombre}).execute()
    except Exception as e:
        logger.error(f"Error saving tag: {e}")
        pass
        
    return {"message": "Etiqueta guardada"}

@api_router.delete("/tags/{slug}")
async def delete_tag(slug: str, nombre: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    try:
        supabase.table('etiquetas').delete().match({"negocio_id": business.id, "nombre": nombre}).execute()
    except:
        pass
    return {"message": "Etiqueta eliminada"}


# ============ TABLES ROUTES ============
@api_router.get("/tables/{slug}", response_model=List[Table])
async def get_tables(slug: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('mesas').select('*').eq('negocio_id', business_id).order('numero').execute()
    tables = response.data
    return [Table(**t) for t in tables]


@api_router.post("/tables/{slug}", response_model=Table)
async def create_table(slug: str, data: TableCreate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Check if table number exists
    response = supabase.table('mesas').select('id').match({"negocio_id": business.id, "numero": data.numero}).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="Número de mesa ya existe")
    
    table = Table(
        **data.model_dump(),
        negocio_id=business.id,
        qr_code=f"/{slug}/mesa/{data.numero}"
    )
    
    supabase.table('mesas').insert(serialize_doc(table.model_dump())).execute()
    
    # Broadcast table update
    await manager.broadcast(business.id, {
        "type": "table_created",
        "data": serialize_doc(table.model_dump())
    })
    
    return table


@api_router.put("/tables/{slug}/{table_id}", response_model=Table)
async def update_table(slug: str, table_id: str, data: TableUpdate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    response = supabase.table('mesas').update(update_data).match({
        "id": table_id, 
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    table_doc = response.data[0]
    table = Table(**table_doc)
    
    # Broadcast table update
    await manager.broadcast(business.id, {
        "type": "table_updated",
        "data": serialize_doc(table.model_dump())
    })
    
    return table


@api_router.delete("/tables/{slug}/{table_id}")
async def delete_table(slug: str, table_id: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    response = supabase.table('mesas').delete().match({
        "id": table_id, 
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    # Broadcast table deletion
    await manager.broadcast(business.id, {
        "type": "table_deleted",
        "data": {"id": table_id}
    })
    
    return {"message": "Mesa eliminada"}


@api_router.get("/tables/{slug}/{table_number}/info")
async def get_table_by_number(slug: str, table_number: int):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('mesas').select('*').match({"negocio_id": business_id, "numero": table_number}).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    return Table(**response.data[0])


# ============ EMPLOYEES ROUTES ============
@api_router.get("/employees/{slug}", response_model=List[Employee])
async def get_employees(slug: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    response = supabase.table('empleados').select('*').eq('negocio_id', business.id).execute()
    employees = response.data
    return [Employee(**e) for e in employees]


@api_router.post("/employees/{slug}", response_model=Employee)
async def create_employee(slug: str, data: EmployeeCreate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Check if PIN exists
    response = supabase.table('empleados').select('id').match({"negocio_id": business.id, "pin": data.pin}).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="PIN ya en uso")
    
    employee = Employee(
        **data.model_dump(),
        negocio_id=business.id
    )
    
    supabase.table('empleados').insert(serialize_doc(employee.model_dump())).execute()
    return employee


@api_router.put("/employees/{slug}/{employee_id}", response_model=Employee)
async def update_employee(slug: str, employee_id: str, data: EmployeeCreate, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Check if PIN exists (excluding current employee)
    # We first find if any OTHER employee has this PIN
    response = supabase.table('empleados').select('id').match({"negocio_id": business.id, "pin": data.pin}).neq('id', employee_id).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="PIN ya en uso")
    
    update_data = data.model_dump()
    
    response = supabase.table('empleados').update(update_data).match({
        "id": employee_id, 
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    return Employee(**response.data[0])


@api_router.delete("/employees/{slug}/{employee_id}")
async def delete_employee(slug: str, employee_id: str, business: Business = Depends(get_current_business)):
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    response = supabase.table('empleados').delete().match({
        "id": employee_id, 
        "negocio_id": business.id
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    return {"message": "Empleado eliminado"}


# ============ ORDERS ROUTES ============
@api_router.get("/orders/{slug}", response_model=List[Order])
async def get_orders(
    slug: str,
    estado: Optional[str] = None,
    limit: int = Query(50, le=1000),
    skip: int = 0
):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    query = supabase.table('pedidos').select('*').eq('negocio_id', business_id).order('created_at', desc=True).range(skip, skip + limit - 1)
    if estado:
        query = query.eq('estado', estado)
    
    response = query.execute()
    orders = response.data
    return [Order(**o) for o in orders]


@api_router.get("/orders/{slug}/active", response_model=List[Order])
async def get_active_orders(slug: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('pedidos').select('*').match({"negocio_id": business_id}).in_('estado', ["pendiente", "preparando", "listo"]).order('created_at').execute()
    orders = response.data
    return [Order(**o) for o in orders]


from fastapi import BackgroundTasks

@api_router.post("/orders/{slug}", response_model=Order)
async def create_order(slug: str, data: OrderCreate, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Creating order for slug: {slug}")
        
        response = supabase.table('negocios').select('*').eq('slug', slug).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        
        business_data = response.data[0]
        business_id = business_data['id']
        business_name = business_data['nombre']
        business_phone = business_data.get('whatsapp') or business_data.get('telefono')
        
        # Twilio Config for this business
        twilio_config = {
            "sid": business_data.get('twilio_sid'),
            "token": business_data.get('twilio_token'),
            "number": business_data.get('twilio_number')
        } if business_data.get('twilio_sid') else None

        # Validate Plan Limits (Orders)
        # Count orders for this business in the current month
        # Get start/end of current month
        today = datetime.now(timezone.utc)
        start_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        count_res = supabase.table('pedidos').select('id', count='exact')\
            .eq('negocio_id', business_id)\
            .gte('created_at', start_month.isoformat())\
            .execute()
            
        order_count = count_res.count or 0
        biz_plan = business_data.get('plan', 'trial') # Default to trial
        
        # Plan Limits
        LIMITS = {
            'trial': 50,      # Trial limit (optional, user said trial allows functionality but no WA)
            'impulso': 100,
            'pro': 400,
            'elite': 999999,
            'business': 999999 # Alias for elite
        }
        
        limit = LIMITS.get(biz_plan, 50) # Default to lowest if unknown
        
        if order_count >= limit:
             raise HTTPException(status_code=402, detail=f"Has alcanzado el límite de {limit} pedidos de tu plan {biz_plan}. Actualiza tu plan para seguir vendiendo.")

        # Calculate total
        subtotal = sum((item.cantidad or 0) * (item.precio_unitario or 0) for item in data.items)
        total = subtotal + (data.costo_envio or 0)
            
        order = Order(
            **data.model_dump(),
            negocio_id=business_id,
            total=total
        )
        
        order_dict = serialize_doc(order.model_dump())
        
        # Filter for DB columns (Remove mesero_id and ensure compatibility)
        order_dict.pop('mesero_id', None)
        order_dict.pop('mesero_nombre', None)
        order_dict.pop('negocio_nombre', None)
        order_dict.pop('negocio_logo', None)
        
        if 'tipo' in order_dict and 'tipo_pedido' not in order_dict:
            order_dict['tipo_pedido'] = order_dict['tipo']
            
        logger.info(f"Inserting into DB: {order_dict.get('id')}")
        
        supabase.table('pedidos').insert(order_dict).execute()
        
        # Update table status if mesa_id provided
        if data.mesa_id:
            supabase.table('mesas').update({"estado": "ocupada"}).eq("id", data.mesa_id).execute()
        
        # Broadcast new order to kitchen
        await manager.broadcast(business_id, {
            "type": "new_order",
            "data": order_dict
        })

        # 2. Credits Deduction Logic
        # Notificaciones WA: 2 Créditos (Cliente + Negocio)
        # El cargo por Sesión IA (1 crédito) ya fue realizado por el Agente.
        credits_to_deduct = 2
        
        wa_credits = business_data.get('wa_credits', 0)
        wa_count = business_data.get('wa_messages_count', 0)
        
        if wa_credits >= credits_to_deduct:
            supabase.table('negocios').update({"wa_credits": wa_credits - credits_to_deduct}).eq("id", business_id).execute()
        else:
            supabase.table('negocios').update({"wa_messages_count": wa_count + credits_to_deduct}).eq("id", business_id).execute()

        # Send WhatsApp notifications (Client + Business)
        background_tasks.add_task(send_order_wa_background, business_name, order, business_phone, twilio_config)
        
        return order
    except Exception as e:
        logger.error(f"ERROR in create_order: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error creando pedido: {str(e)}")

def format_order_notification_business(order: Order, business_name: str) -> str:
    """Format notification message for the business owner"""
    fecha = datetime.now().strftime("%d/%m/%Y, %H:%M")
    cliente = order.cliente_nombre or "Cliente"
    telefono = order.cliente_telefono or "No registrado"
    
    msg = f"🔔 *NUEVO PEDIDO RECIBIDO*\n"
    msg += f"🏢 *{business_name}*\n"
    msg += f"📅 {fecha}\n\n"
    
    msg += f"👤 *Cliente:* {cliente}\n"
    msg += f"📱 *Teléfono:* {telefono}\n"
    
    if order.tipo == "delivery":
         msg += f"🛵 *Domicilio*\n"
         msg += f"📍 *Dirección:* {order.direccion or 'No especificada'}\n"
         if order.notas:
             msg += f"📝 *Notas:* {order.notas}\n"
    elif order.tipo == "mesa":
         msg += f"🍽️ *Mesa:* {order.mesa_numero or 'Sin numero'}\n"
    elif order.tipo == "takeaway":
         msg += f"🛍️ *Para Llevar*\n"
         
    msg += "\n*--- DETALLE DEL PEDIDO ---*\n"
    for item in order.items:
        msg += f"• {item.cantidad}x {item.nombre}\n"
        if item.modificadores:
            mods = []
            for m in item.modificadores:
                if isinstance(m, dict):
                    name = m.get('nombre', '')
                    price = m.get('precio', 0)
                    if price and price > 0:
                        mods.append(f"{name} (+${price:,.0f})")
                    else:
                        mods.append(name)
                else:
                    mods.append(str(m))
            msg += f"  (Opciones: {', '.join(mods)})\n"
        if item.notas and item.notas != "No aplica":
            msg += f"  (Nota: {item.notas})\n"
        
    msg += f"\n💰 *TOTAL: ${order.total:,.0f}*\n"
    msg += f"💳 *Pago:* {order.metodo_pago}\n"
    
    return msg

def send_order_wa_background(business_name: str, order: Order, business_phone: str = None, twilio_config: Dict[str, Any] = None):
    """Send order notifications to Client and Business"""
    # 1. Send to Client
    if order.cliente_telefono:
        try:
            wa_message = format_order_summary_wa(business_name, order)
            send_whatsapp_response(order.cliente_telefono, wa_message, twilio_config)
            logger.info(f"WhatsApp summary sent to client {order.cliente_telefono}")
        except Exception as wa_err:
            logger.error(f"Error sending WhatsApp to client: {wa_err}")
            logger.error(traceback.format_exc())

    # 2. Send to Business
    if business_phone:
        try:
            biz_message = format_order_notification_business(order, business_name)
            send_whatsapp_response(business_phone, biz_message, twilio_config)
            logger.info(f"WhatsApp notification sent to business {business_phone}")
        except Exception as wa_err:
            logger.error(f"Error sending WhatsApp to business: {wa_err}")
            logger.error(traceback.format_exc())

def notify_delivery_update_background(slug: str, order_id: str, type: str, data: dict = None):
    """
    Background task to handle delivery notifications.
    type: 'assignment' (to messenger), 'enviado' (to customer), 'entregado' (to customer/admin)
    """
    try:
        # Fetch fresh data
        res_order = supabase.table('pedidos').select('*').eq('id', order_id).execute()
        if not res_order.data: return
        order = res_order.data[0]
        
        res_biz = supabase.table('negocios').select('*').eq('slug', slug).execute()
        if not res_biz.data: return
        biz = res_biz.data[0]
        
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        
        if type == 'assignment':
            # Notify Messenger
            rep_id = order.get('repartidor_id')
            if not rep_id: return
            res_rep = supabase.table('empleados').select('*').eq('id', rep_id).execute()
            if not res_rep.data: return
            rep = res_rep.data[0]
            
            link = f"{frontend_url}/reparto/{slug}/{order_id}"
            msg = f"🛵 *Nuevo Pedido Asignado*\n\nHola {rep['nombre']}, tienes un nuevo pedido para entregar (#ID: {order_id[:8].upper()}).\n\n📍 GESTIONAR AQUÍ: {link}"
            
            phone = rep.get('telefono')
            if phone:
                send_whatsapp_response(phone, msg)
            else:
                logger.warning(f"Repartidor {rep['nombre']} sin telefono") 
            
        elif type == 'enviado':
            # Notify Customer
            link = f"{frontend_url}/{slug}/mis-pedidos"
            msg = f"🔔 *¡Tu pedido va en camino!* (#ID: {order_id[:8].upper()})\n\nNuestro repartidor ya salió del local. Puedes seguir el rastro en tiempo real aquí: {link}\n\n¡Prepárate!"
            send_whatsapp_response(order['cliente_telefono'], msg)
            
        elif type == 'entregado':
            # Notify Customer
            msg_cust = f"✅ *¡Pedido Entregado!* (#ID: {order_id[:8].upper()})\n\nEsperamos que disfrutes tu comida. ¡Gracias por elegir {biz['nombre']}!"
            if order.get('cliente_telefono'):
                send_whatsapp_response(order['cliente_telefono'], msg_cust)
            
            # Notify Admin/Business
            msg_admin = f"💰 *ENTREGA COMPLETADA*\n\nEl pedido #{order_id[:8].upper()} ha sido entregado exitosamente al cliente {order.get('cliente_nombre', 'Cliente')}."
            biz_phone = biz.get('whatsapp') or biz.get('telefono')
            if biz_phone:
                send_whatsapp_response(biz_phone, msg_admin)

    except Exception as e:
        logger.error(f"Error in delivery notification background: {str(e)}")


@api_router.put("/orders/{slug}/{order_id}", response_model=Order)
async def update_order(slug: str, order_id: str, data: OrderUpdate, background_tasks: BackgroundTasks):
    try:
        response = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        business_id = response.data[0]['id']
        
        # Create update dict
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        
        if not update_data:
             raise HTTPException(status_code=400, detail="No data to update")
            
        res = supabase.table('pedidos').update(update_data).eq('id', order_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
            
        updated_order = res.data[0]
        order = Order(**updated_order)
        
        # If order is delivered or cancelled, free the table
        if data.estado in [OrderStatus.ENTREGADO, OrderStatus.CANCELADO] and order.mesa_id:
            supabase.table('mesas').update({"estado": "libre"}).eq("id", order.mesa_id).execute()
        
        # Award loyalty points when order is delivered
        points_info = None
        if data.estado == OrderStatus.ENTREGADO and order.cliente_telefono:
            logger.info(f"[LOYALTY] Order {order.id} delivered. Checking loyalty for business {business_id}...")
            points_info = await award_loyalty_points(
                negocio_id=business_id,
                telefono=order.cliente_telefono,
                nombre=order.cliente_nombre,
                total=order.total,
                pedido_id=order.id
            )
            if points_info:
                logger.info(f"[LOYALTY] Awarded {points_info['puntos_ganados']} points for order {order.id}")
            else:
                logger.info(f"[LOYALTY] No points awarded for order {order.id} (program inactive or not configured)")
        
        # Broadcast order update
        broadcast_data = serialize_doc(Order(**updated_order).model_dump())
        if points_info:
            broadcast_data['puntos_ganados'] = points_info
        
        if 'repartidor_id' in update_data:
            asyncio.create_task(asyncio.to_thread(notify_delivery_update_background, slug, order_id, 'assignment'))
        
        if data.estado == OrderStatus.ENVIADO:
            asyncio.create_task(asyncio.to_thread(notify_delivery_update_background, slug, order_id, 'enviado'))
        
        if data.estado == OrderStatus.ENTREGADO:
            asyncio.create_task(asyncio.to_thread(notify_delivery_update_background, slug, order_id, 'entregado'))

        return order
    except Exception as e:
        logger.error(f"Error in update_order: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/orders/{slug}/track/{order_id}", response_model=Order)
async def track_order(slug: str, order_id: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('pedidos').select('*').match({"id": order_id, "negocio_id": business_id}).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    order_doc = response.data[0]
    
    # Inject business coordinates for tracking
    biz_res = supabase.table('negocios').select('lat, lng').eq('id', business_id).execute()
    if biz_res.data:
        order_doc['business_lat'] = biz_res.data[0].get('lat')
        order_doc['business_lng'] = biz_res.data[0].get('lng')
        
    return Order(**order_doc)


@api_router.get("/orders/{slug}/my-orders")
async def get_customer_orders(slug: str, telefono: str):
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # Búsqueda flexible: con y sin prefijo +57
    possible_phones = [telefono]
    if not telefono.startswith('+'):
        possible_phones.append(f"+57{telefono}")
    
    or_filter = ",".join([f"cliente_telefono.eq.{p}" for p in possible_phones])
    
    response = supabase.table('pedidos').select('*').eq('negocio_id', business_id)\
        .or_(or_filter)\
        .order('created_at', desc=True).limit(20).execute()
    
    orders = response.data
    return [Order(**o) for o in orders]


# ============ LOYALTY PROGRAM ============
@api_router.get("/loyalty/{slug}/config", response_model=LoyaltyConfig)
async def get_loyalty_config(slug: str):
    """Get loyalty program configuration for a business"""
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    response = supabase.table('fidelizacion_config').select('*').eq('negocio_id', business_id).execute()
    if not response.data:
        # Return default config if none exists (all zeros = not configured)
        return LoyaltyConfig(
            negocio_id=business_id,
            activo=False,
            pesos_por_punto=0,
            puntos_minimo_canje=0,
            valor_punto_descuento=0
        )
    
    # Check plan for loyalty access
    # We need to fetch the business plan first if not joined in previous query
    # Since we already fetched business_id from slug, let's just assume we can get plan easily or check it here
    # Optimization: The initial query for business_id could fetch the plan.
    
    return LoyaltyConfig(**response.data[0])


@api_router.post("/loyalty/{slug}/config", response_model=LoyaltyConfig)
async def create_or_update_loyalty_config(slug: str, data: LoyaltyConfigCreate, business: Business = Depends(get_current_business)):
    """Create or update loyalty program configuration"""
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")

    # PLAN CHECK: Loyalty requires 'pro' or 'elite'/'business'
    if business.plan in ['trial', 'impulso']:
         raise HTTPException(status_code=403, detail="Esta función requiere el plan Crecimiento Pro o superior.")
    
    # VALIDATION: Can't activate without proper pesos_por_punto configuration
    if data.activo and (not data.pesos_por_punto or data.pesos_por_punto <= 0):
        raise HTTPException(
            status_code=400, 
            detail="No puedes activar el programa sin configurar el valor de pesos por punto. Define la 'Configuración Técnica Definitiva' primero."
        )
    
    existing_response = supabase.table('fidelizacion_config').select('*').eq('negocio_id', business.id).execute()
    
    if existing_response.data:
        # Update existing
        update_data = data.model_dump()
        response = supabase.table('fidelizacion_config').update(update_data).eq('negocio_id', business.id).execute()
        config_doc = response.data[0]
    else:
        # Create new
        config = LoyaltyConfig(
            **data.model_dump(),
            negocio_id=business.id
        )
        response = supabase.table('fidelizacion_config').insert(serialize_doc(config.model_dump())).execute()
        config_doc = response.data[0]
    
    return LoyaltyConfig(**config_doc)


@api_router.put("/loyalty/{slug}/config", response_model=LoyaltyConfig)
async def update_loyalty_config(slug: str, data: LoyaltyConfigUpdate, business: Business = Depends(get_current_business)):
    """Update loyalty program configuration"""
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")

    # PLAN CHECK: Loyalty requires 'pro' or 'elite'/'business'
    if business.plan in ['trial', 'impulso']:
         raise HTTPException(status_code=403, detail="Esta función requiere el plan Crecimiento Pro o superior.")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    # VALIDATION: If trying to activate, ensure pesos_por_punto is configured
    if update_data.get('activo') is True:
        # Check if pesos_por_punto is being set in this request or exists in DB
        ppp = update_data.get('pesos_por_punto')
        if ppp is None:
            # Not in this update, check current DB value
            existing = supabase.table('fidelizacion_config').select('pesos_por_punto').eq('negocio_id', business.id).execute()
            if existing.data:
                ppp = existing.data[0].get('pesos_por_punto', 0)
        if not ppp or ppp <= 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes activar el programa sin configurar el valor de pesos por punto."
            )
    
    response = supabase.table('fidelizacion_config').update(update_data).eq('negocio_id', business.id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Configuración no encontrada. Cree una primero.")
    
    return LoyaltyConfig(**response.data[0])


@api_router.get("/loyalty/{slug}/points/{telefono}", response_model=CustomerPointsPublic)
async def get_customer_points(slug: str, telefono: str):
    """Get customer loyalty points and stats"""
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # Get general point info
    response = supabase.table('clientes_puntos').select('*').match({
        "negocio_id": business_id,
        "telefono": telefono
    }).execute()
    
    # Get order stats
    orders_res = supabase.table('pedidos').select('total').match({
        "negocio_id": business_id,
        "cliente_telefono": telefono
    }).execute()
    
    total_compras = sum(float(o.get('total', 0) or 0) for o in orders_res.data) if orders_res.data else 0.0
    cantidad_pedidos = len(orders_res.data) if orders_res.data else 0
    
    if not response.data:
        return CustomerPointsPublic(
            telefono=telefono,
            nombre=None,
            puntos_actuales=0,
            puntos_disponibles=0,
            puntos_totales=0,
            total_compras=total_compras,
            cantidad_pedidos=cantidad_pedidos
        )
    
    c = response.data[0]
    puntos_actuales = c.get('puntos_actuales', 0)
    puntos_totales = c.get('puntos_totales', 0)
    
    return CustomerPointsPublic(
        telefono=c['telefono'],
        nombre=c.get('nombre'),
        email=c.get('email'),
        fecha_nacimiento=c.get('fecha_nacimiento'),
        puntos_actuales=puntos_actuales,
        puntos_disponibles=puntos_actuales,
        puntos_totales=puntos_totales,
        puntos_canjeados=max(0, puntos_totales - puntos_actuales),
        total_compras=total_compras,
        cantidad_pedidos=cantidad_pedidos,
        visit_context=c.get('visit_context'),
        created_at=c.get('created_at')
    )


@api_router.get("/loyalty/{slug}/customers")
async def get_loyalty_customers(slug: str, q: Optional[str] = None, business: Business = Depends(get_current_business), limit: int = 50):
    """Get all customers with loyalty points (for business owner)"""
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    query = supabase.table('clientes_puntos').select('*').eq("negocio_id", business.id)
    
    if q:
        # Search by name or phone
        query = query.or_(f"nombre.ilike.%{q}%,telefono.ilike.%{q}%")
    
    response = query.order("puntos_actuales", desc=True).limit(limit).execute()
    customers = response.data
    
    return [CustomerPointsPublic(
        telefono=c['telefono'],
        nombre=c.get('nombre'),
        email=c.get('email'),
        fecha_nacimiento=c.get('fecha_nacimiento'),
        puntos_actuales=c.get('puntos_actuales', 0),
        puntos_disponibles=c.get('puntos_actuales', 0),
        puntos_totales=c.get('puntos_totales', 0),
        puntos_canjeados=max(0, (c.get('puntos_totales', 0) or 0) - (c.get('puntos_actuales', 0) or 0)),
        created_at=c.get('created_at'),
        total_compras=0.0,
        cantidad_pedidos=0
    ) for c in customers]


@api_router.post("/loyalty/{slug}/customers", response_model=CustomerPointsPublic)
async def create_loyalty_customer(slug: str, data: CustomerCreate, business: Business = Depends(get_current_business)):
    """Register a new loyalty customer"""
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Check if customer exists
    existing = supabase.table('clientes_puntos').select('*').match({
        "negocio_id": business.id,
        "telefono": data.telefono
    }).execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="El cliente ya está registrado con este teléfono")

    # Create new customer
    new_customer = {
        "negocio_id": business.id,
        "telefono": data.telefono,
        "nombre": data.nombre,
        "email": data.email,
        "fecha_nacimiento": data.fecha_nacimiento,

        "puntos_actuales": 0,
        "puntos_totales": 0
    }
    
    try:
        res = supabase.table('clientes_puntos').insert(new_customer).execute()
        
        if not res.data:
             raise HTTPException(status_code=500, detail="Error al crear cliente")
             
        c = res.data[0]
        return CustomerPointsPublic(
            telefono=c['telefono'],
            nombre=c.get('nombre'),
            email=c.get('email'),
            fecha_nacimiento=c.get('fecha_nacimiento'),
            puntos_disponibles=0,
            puntos_totales=0,
            puntos_canjeados=0,
            total_compras=0.0,
            cantidad_pedidos=0
        )
    except Exception as e:
        print(f"Error creating customer: {e}")
        # If column does not exist, it will fail here. We might need to handle it or let it fail so we know.
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@api_router.post("/loyalty/{slug}/award")
async def award_points_manual(slug: str, data: AwardPointsRequest, business: Business = Depends(get_current_business)):
    """Manually award points to a customer"""
    try:
        if business.slug != slug:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # CHECK: Verify loyalty program is active and configured
        config_res = supabase.table('fidelizacion_config').select('activo, pesos_por_punto').eq('negocio_id', business.id).execute()
        if not config_res.data:
            raise HTTPException(status_code=400, detail="El programa de fidelidad no ha sido configurado. Configúralo primero en la sección de Fidelización.")
        
        loyalty_config = config_res.data[0]
        if not loyalty_config.get('activo', False):
            raise HTTPException(status_code=400, detail="El programa de fidelidad está pausado. Actívalo primero para poder acreditar puntos.")
        
        if (loyalty_config.get('pesos_por_punto', 0) or 0) <= 0:
            raise HTTPException(status_code=400, detail="Debes configurar el valor de pesos por punto antes de acreditar puntos.")
        
        # Get customer points record or create it
        response = supabase.table('clientes_puntos').select('*').match({
            "negocio_id": business.id,
            "telefono": data.telefono
        }).execute()
        
        updated_customer = None

        if response.data:
            customer = response.data[0]
            # Update existing
            total_points = customer.get('puntos_totales', 0) + data.puntos
            current_points = customer.get('puntos_actuales', 0) + data.puntos
            
            response = supabase.table('clientes_puntos').update({
                "puntos_totales": total_points,
                "puntos_actuales": current_points
            }).eq("id", customer['id']).execute()
            
            if response.data:
                updated_customer = response.data[0]
            else:
                 raise HTTPException(status_code=500, detail="Error updating customer points")
        else:
            # Create new customer entry
            new_customer = {
                "negocio_id": business.id,
                "telefono": data.telefono,
                "nombre": "Cliente Nuevo", # Should ideally get name from somewhere if possible, or update later
                "puntos_totales": data.puntos,
                "puntos_actuales": data.puntos
            }
            response = supabase.table('clientes_puntos').insert(new_customer).execute()
            if response.data:
                updated_customer = response.data[0]
            else:
                raise HTTPException(status_code=500, detail="Error creating customer points record")
        
        if not updated_customer:
             raise HTTPException(status_code=500, detail="Failed to get updated customer record")

        # Create transaction record
        transaction = {
            "cliente_puntos_id": updated_customer['id'],
            "tipo": "ganado",
            "puntos": data.puntos,
            "descripcion": data.descripcion or f"Acreditación manual de {data.puntos} puntos",
            "monto": data.monto
        }
        supabase.table('transacciones_puntos').insert(transaction).execute()
        
        return {
            "exito": True,
            "puntos_ganados": data.puntos,
            "puntos_actuales": updated_customer['puntos_actuales']
        }
    except Exception as e:
        print(f"Error awarding points: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@api_router.post("/loyalty/{slug}/redeem", response_model=RedeemPointsResponse)
async def redeem_points(slug: str, data: RedeemPointsRequest):
    """Redeem loyalty points for a discount"""
    # Get business
    biz_res = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not biz_res.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = biz_res.data[0]['id']
    
    # Get loyalty config - MUST be active
    config_res = supabase.table('fidelizacion_config').select('*').eq('negocio_id', business_id).execute()
    if not config_res.data or not config_res.data[0].get('activo', False):
        raise HTTPException(status_code=400, detail="El programa de fidelidad no está activo")
    config = config_res.data[0]
    
    if (config.get('pesos_por_punto', 0) or 0) <= 0:
        raise HTTPException(status_code=400, detail="El programa de fidelidad no está configurado correctamente")
    
    # Get customer points
    cust_res = supabase.table('clientes_puntos').select('*').match({
        "negocio_id": business_id,
        "telefono": data.telefono
    }).execute()
    
    if not cust_res.data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado en el programa de fidelidad")
    
    customer = cust_res.data[0]
    puntos_actuales = customer.get('puntos_actuales', 0)
    
    if puntos_actuales < data.puntos_a_canjear:
        return RedeemPointsResponse(
            exito=False,
            mensaje=f"No tienes suficientes puntos. Disponibles: {puntos_actuales}",
            descuento_aplicado=0,
            puntos_restantes=puntos_actuales
        )
    
    minimo_canje = config.get('puntos_minimo_canje', 100)
    if data.puntos_a_canjear < minimo_canje:
        return RedeemPointsResponse(
            exito=False,
            mensaje=f"Mínimo {minimo_canje} puntos para canjear",
            descuento_aplicado=0,
            puntos_restantes=puntos_actuales
        )
    
    # Calculate discount
    valor_punto = config.get('valor_punto_descuento', 100)
    descuento = data.puntos_a_canjear * valor_punto
    
    # Update customer points
    new_actuales = puntos_actuales - data.puntos_a_canjear
    
    supabase.table('clientes_puntos').update({
        "puntos_actuales": new_actuales,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq('id', customer['id']).execute()
    
    # Create transaction record
    try:
        transaction = {
            "cliente_puntos_id": customer['id'],
            "tipo": "canjeado",
            "puntos": -data.puntos_a_canjear,
            "descripcion": f"Canje de {data.puntos_a_canjear} puntos por descuento de ${descuento:,.0f}"
        }
        supabase.table('transacciones_puntos').insert(transaction).execute()
    except Exception as te:
        logger.error(f"Error creating redeem transaction: {te}")
    
    return RedeemPointsResponse(
        exito=True,
        mensaje=f"¡Canjeaste {data.puntos_a_canjear} puntos! Descuento: ${descuento:,.0f} COP",
        descuento_aplicado=descuento,
        puntos_restantes=new_actuales
    )


@api_router.get("/loyalty/{slug}/transactions/{telefono}")
async def get_points_transactions(slug: str, telefono: str, limit: int = 20):
    """Get customer points transaction history"""
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # First get the customer record
    response = supabase.table('clientes_puntos').select('id').match({
        "negocio_id": business_id,
        "telefono": telefono
    }).execute()
    
    if not response.data:
        return []
    
    customer_id = response.data[0]['id']
    
    response = supabase.table('transacciones_puntos').select('*').eq('cliente_puntos_id', customer_id).order('created_at', desc=True).limit(limit).execute()
    return response.data


@api_router.get("/loyalty/{slug}/recent-transactions")
async def get_recent_transactions(slug: str, limit: int = 10, start_date: str = None, end_date: str = None):
    """Get recent points transactions for the business, optionally filtered by date"""
    response = supabase.table('negocios').select('id').eq('slug', slug).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    business_id = response.data[0]['id']
    
    # Query transactions joining with customers to filter by business_id
    query = supabase.table('transacciones_puntos').select(
        '*, clientes_puntos!inner(nombre, telefono, negocio_id)'
    ).eq('clientes_puntos.negocio_id', business_id).order('created_at', desc=True)

    if start_date:
        query = query.gte('created_at', start_date)
    
    if end_date:
        # Assuming end_date logic to include the full day if only date is passed
        query = query.lte('created_at', end_date)
        
    if not start_date and not end_date:
        query = query.limit(limit)

    response = query.execute()
    
    if not response.data:
        return []
        
    transactions = []
    for t in response.data:
        customer = t.get('clientes_puntos', {})
        transactions.append({
            "id": t['id'],
            "nombre": customer.get('nombre') or customer.get('telefono'),
            "puntos": t['puntos'],
            "monto": t.get('monto', 0),
            "fecha": t['created_at'], 
            "estado": "Completado" 
        })
        
    return transactions


# Helper function to award points after order completion
async def award_loyalty_points(negocio_id: str, telefono: str, nombre: str, total: float, pedido_id: str):
    """Award loyalty points to customer after successful order"""
    if not telefono:
        return None
    
    # Get loyalty config
    response = supabase.table('fidelizacion_config').select('*').eq("negocio_id", negocio_id).execute()
    if not response.data:
        logger.info(f"[LOYALTY] No loyalty config found for business {negocio_id}. Skipping points.")
        return None
    
    config = response.data[0]
    is_active = config.get('activo', False)
    
    if not is_active:
        logger.info(f"[LOYALTY] Program INACTIVE for business {negocio_id}. Skipping points for order {pedido_id}.")
        return None
    
    # Calculate points
    pesos_por_punto = float(config.get('pesos_por_punto', 0))
    if pesos_por_punto <= 0:
        logger.warning(f"[LOYALTY] Business {negocio_id} has program active but pesos_por_punto={pesos_por_punto}. Skipping points.")
        return None
        
    puntos_ganados = int(total / pesos_por_punto)
    
    if puntos_ganados < 1:
        return None
    
    # Get or create customer record
    response = supabase.table('clientes_puntos').select('*').match({
        "negocio_id": negocio_id,
        "telefono": telefono
    }).execute()
    
    if response.data:
        customer = response.data[0]
        # Update existing
        response = supabase.table('clientes_puntos').update({
            "nombre": nombre or customer.get('nombre'),
            "puntos_totales": (customer.get('puntos_totales') or 0) + puntos_ganados,
            "puntos_actuales": (customer.get('puntos_actuales') or 0) + puntos_ganados,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).match({"negocio_id": negocio_id, "telefono": telefono}).execute()
        
        if not response.data:
            return None
        updated_customer = response.data[0]
    else:
        # Create new customer
        new_customer = {
            "negocio_id": negocio_id,
            "telefono": telefono,
            "nombre": nombre,
            "puntos_totales": puntos_ganados,
            "puntos_actuales": puntos_ganados
        }
        response = supabase.table('clientes_puntos').insert(new_customer).execute()
        if not response.data:
            return None
        updated_customer = response.data[0]
    
    # Create transaction record
    try:
        transaction = {
            "cliente_puntos_id": updated_customer['id'],
            "tipo": "ganado",
            "puntos": puntos_ganados,
            "pedido_id": pedido_id,
            "descripcion": f"Ganaste {puntos_ganados} puntos por compra de ${total:,.0f}"
        }
        supabase.table('transacciones_puntos').insert(transaction).execute()
    except Exception as te:
        logger.error(f"Error creating points transaction: {te}")
        # Not critical enough to fail the whole order update
    
    current_puntos = updated_customer.get('puntos_actuales', 0)
    return {
        "puntos_ganados": puntos_ganados,
        "puntos_totales": current_puntos,
        "mensaje": f"¡Ganaste {puntos_ganados} puntos! Total: {current_puntos}"
    }


# ============ MARKETING & CAMPAIGNS ============

class CampaignRequest(BaseModel):
    segment_id: str  # 'all', 'oro', 'plata', 'bronce', 'new', 'inactive'
    message: str

@app.post("/api/marketing/send-campaign")
async def send_marketing_campaign(request: CampaignRequest, background_tasks: BackgroundTasks, business: Business = Depends(get_current_business)):
    """
    Sends a bulk WhatsApp campaign to a specific segment of customers.
    Deducts wa_credits from the business account.
    """
    # 1. Fetch Customers
    try:
        res = supabase.table('clientes_puntos').select('*').eq('negocio_id', business.id).execute()
        all_customers = res.data if res.data else []
    except Exception as e:
        logger.error(f"Error fetching customers for campaign: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar la base de datos de clientes.")
    
    # 2. Filter by Segment
    filtered_customers = []
    now = datetime.now(timezone.utc)
    
    if request.segment_id == 'all':
        filtered_customers = all_customers
    elif request.segment_id == 'oro':
        filtered_customers = [c for c in all_customers if c.get('puntos_totales', 0) > 1000]
    elif request.segment_id == 'plata':
        filtered_customers = [c for c in all_customers if 300 <= c.get('puntos_totales', 0) <= 1000]
    elif request.segment_id == 'bronce':
        filtered_customers = [c for c in all_customers if c.get('puntos_totales', 0) < 300]
    elif request.segment_id == 'new':
        # Joined in last 30 days
        thirty_days_ago = now - timedelta(days=30)
        filtered_customers = [c for c in all_customers if datetime.fromisoformat(c.get('created_at').replace('Z', '+00:00')) > thirty_days_ago]
    elif request.segment_id == 'inactive':
        # Not updated in last 30 days
        thirty_days_ago = now - timedelta(days=30)
        filtered_customers = [c for c in all_customers if datetime.fromisoformat(c.get('updated_at').replace('Z', '+00:00')) < thirty_days_ago]
        
    count = len(filtered_customers)
    if count == 0:
        return {"success": False, "message": "No hay clientes en este segmento para enviar la campaña."}

    # 3. Check Credits
    if (business.wa_credits or 0) < count:
        raise HTTPException(
            status_code=403, 
            detail=f"Créditos insuficientes. Tu saldo es de {business.wa_credits or 0} créditos y la campaña requiere {count}."
        )
    
    # 4. Deduct Credits
    new_credits = (business.wa_credits or 0) - count
    try:
        supabase.table('negocios').update({"wa_credits": new_credits}).eq('id', business.id).execute()
    except Exception as e:
        logger.error(f"Error updating wa_credits for {business.id}: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el descuento de créditos.")
    
    # 5. Send (Background)
    background_tasks.add_task(process_campaign_execution, business, filtered_customers, request.message)
    
    return {
        "success": True, 
        "message": f"Campaña iniciada para {count} clientes.",
        "count": count,
        "remaining_credits": new_credits
    }

async def process_campaign_execution(business: Business, customers: List[Dict], message_template: str):
    """
    Simulates or executes the sending of WhatsApp messages in a background task.
    """
    logger.info(f"Iniciando ejecución de campaña para {business.nombre} ({len(customers)} clientes)")
    
    for customer in customers:
        # Replace tags
        msg = message_template.replace("[Nombre]", customer.get('nombre', 'Cliente'))
        msg = msg.replace("[Puntos]", str(customer.get('puntos_actuales', 0)))
        msg = msg.replace("[Saldo]", str(customer.get('puntos_actuales', 0)))
        msg = msg.replace("[Negocio]", business.nombre)
        
        # In a real scenario, call Twilio or WhatsApp API here
        # For now, we simulate and log
        await asyncio.sleep(0.5) # Simulate slight delay between messages
        logger.info(f"Simulación WhatsApp - Para: {customer.get('telefono')} - Mensaje: {msg[:50]}...")

    logger.info(f"Campaña finalizada para {business.nombre}")


@app.get("/api/marketing/audience-counts")
async def get_audience_counts(business: Business = Depends(get_current_business)):
    """
    Returns the count of customers in each marketing segment for the hub.
    """
    try:
        res = supabase.table('clientes_puntos').select('*').eq('negocio_id', business.id).execute()
        customers = res.data if res.data else []
        
        # Birthday today logic (Assuming format YYYY-MM-DD)
        # Using simple string match for MM-DD
        now_local = datetime.now() 
        today_str = now_local.strftime("%m-%d")
        
        birthdays_today = []
        for c in customers:
            bday = c.get('fecha_nacimiento')
            if bday and len(bday) >= 10:
                # Format could be YYYY-MM-DD or DD/MM/YYYY
                if '-' in bday:
                    if bday[5:10] == today_str:
                        birthdays_today.append(c)
                elif '/' in bday:
                    # DD/MM/YYYY -> MM-DD
                    parts = bday.split('/')
                    if len(parts) >= 2:
                        if f"{parts[1]}-{parts[0]}" == today_str:
                            birthdays_today.append(c)

        return {
            "all": len(customers),
            "oro": len([c for c in customers if (c.get('puntos_totales') or 0) > 1000]),
            "plata": len([c for c in customers if 300 <= (c.get('puntos_totales') or 0) <= 1000]),
            "bronce": len([c for c in customers if (c.get('puntos_totales') or 0) < 300]),
            "new": len([c for c in customers if (datetime.now(timezone.utc) - datetime.fromisoformat(c.get('created_at').replace('Z', '+00:00'))).days <= 30]),
            "inactive": len([c for c in customers if (datetime.now(timezone.utc) - datetime.fromisoformat(c.get('updated_at', c.get('created_at')).replace('Z', '+00:00'))).days > 30]),
            "birthdays": len(birthdays_today)
        }
    except Exception as e:
        logger.error(f"Error getting audience counts: {e}")
        return {"all": 0, "oro": 0, "plata": 0, "bronce": 0, "new": 0, "inactive": 0, "birthdays": 0}


# ============ WHATSAPP WEBHOOK (Prepared) ============
@api_router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(hub_mode: str = Query(None, alias="hub.mode"),
                                   hub_verify_token: str = Query(None, alias="hub.verify_token"),
                                   hub_challenge: str = Query(None, alias="hub.challenge")):
    """Verify webhook for WhatsApp Cloud API"""
    verify_token = os.environ.get('WHATSAPP_VERIFY_TOKEN', 'menu.ia-webhook-token')
    
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        return int(hub_challenge)
    
    raise HTTPException(status_code=403, detail="Verificación fallida")


@api_router.post("/whatsapp/webhook")
async def handle_whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages via Twilio"""
    try:
        # Twilio sends form-encoded data
        form_data = await request.form()
        data_dict = dict(form_data)
        print(f"--- WHATSAPP WEBHOOK RECEIVED --- Data: {data_dict}")
        sender_phone = data_dict.get('From', '').replace('whatsapp:', '')
        message_body = data_dict.get('Body', '')
        lat = data_dict.get('Latitude')
        lng = data_dict.get('Longitude')
        
        print(f"DEBUG: Message from {sender_phone}: {message_body} (GPS: {lat}, {lng})")
        
        if not sender_phone:
            return {"status": "ignored", "reason": "missing_phone"}

        # If it's a location message, normalize the body
        if lat and lng:
            gps_info = f"[UBICACIÓN GPS: {lat}, {lng}]"
            message_body = f"{message_body} {gps_info}".strip()

        # 1. Identificar el negocio
        to_number_raw = data_dict.get('To', '')
        to_number = to_number_raw.replace('whatsapp:', '')
        
        from whatsapp_agent import GLOBAL_TWILIO_NUMBER
        
        PLATFORM_BIZ_ID = "f92dc309-3b2b-4ddd-b8c6-723de6da38f3"
        clean_to = to_number.replace('+', '')
        clean_official = GLOBAL_TWILIO_NUMBER.replace('whatsapp:', '').replace('+', '')
        is_official_number = (clean_to == clean_official)
        
        business_data = None
        print(f"DEBUG: to={to_number}, official={GLOBAL_TWILIO_NUMBER}, is_official={is_official_number}")
        
        if is_official_number:
            # Número oficial de la plataforma:
            # Buscar si el usuario es cliente activo de algún restaurante (conversación reciente)
            # Solo consideramos conversaciones de las últimas 48 horas con negocios reales
            from datetime import datetime, timezone, timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
            
            # Buscamos conversaciones recientes excluyendo la plataforma misma
            # y solo conversaciones del canal WhatsApp (no web_)
            conv_res = supabase.table('agent_conversations') \
                .select('negocio_id, last_message_at') \
                .eq('phone_number', sender_phone) \
                .neq('negocio_id', PLATFORM_BIZ_ID) \
                .gte('last_message_at', cutoff) \
                .order('last_message_at', desc=True) \
                .limit(1) \
                .execute()
            
            if conv_res.data:
                # El usuario tiene conversación activa con un restaurante
                neg_id_found = conv_res.data[0]['negocio_id']
                biz_res = supabase.table('negocios').select('*').eq('id', neg_id_found).execute()
                if biz_res.data:
                    business_data = biz_res.data[0]
                    negocio_id = business_data['id']
                    print(f"Usuario {sender_phone} es cliente activo de {business_data.get('nombre')}")
            
            if not business_data:
                # Usuario nuevo o sin conversación activa → Modo Plataforma
                print(f"Modo PLATFORM para {sender_phone} (nuevo usuario o sin negocio activo)")
                negocio_id = PLATFORM_BIZ_ID
        else:
            # Número de whatsapp de un negocio específico
            biz_res = supabase.table('negocios').select('*').eq('whatsapp', to_number).execute()
            if biz_res.data:
                business_data = biz_res.data[0]
                negocio_id = business_data['id']
            else:
                print(f"No se encontró negocio para: {to_number}")
                return {"status": "error", "reason": "no_business_linked"}
        
        if business_data:
            negocio_id = business_data['id']
            biz_plan = business_data.get('plan', 'trial')
            wa_count = business_data.get('wa_messages_count', 0)
            wa_limit = business_data.get('wa_messages_limit', 0)
            wa_credits = business_data.get('wa_credits', 0)

            # PLAN CHECK: WhatsApp disabled for 'free'
            if biz_plan == 'free':
                 return {"status": "blocked", "reason": "free_plan_no_whatsapp"}
            
            if biz_plan == 'trial':
                used_wa = business_data.get('ai_credits_wa_used', 0)
                if used_wa >= 10: # Trial Limit
                    return {"status": "limit_reached", "reason": "trial_wa_limit_reached"}
            
            # 2. Verificar límites de mensajes operativos
            use_credits = False
            if wa_count >= wa_limit:
                if wa_credits > 0:
                    use_credits = True
                else:
                    # Notify Owner if they confirm the service is stopped
                    # SERVICE STOPPED WARNING
                    # Only send once when they try to exceed
                    try:
                        # Get owner phone
                        owner_res = supabase.table('users').select('telefono').eq('negocio_id', negocio_id).execute()
                        if owner_res.data:
                             owner_phone = owner_res.data[0].get('telefono')
                             if owner_phone:
                                 msg = f"⚠️ ALERTA MENU.IA: Tu agente IA se ha detenido.\nHas agotado tu plan mensual ({wa_limit} msjs) y tus créditos adicionales.\n\nPara reactivar el servicio:\n1. Compra un Pack de Mensajes.\n2. O mejora tu Plan (Más mensajes + Funciones Premium).\n\nReactiva aquí: https://menuia.co/dashboard/{business_data.get('slug')}/marketing"
                                 
                                 twilio_config = {
                                     "sid": business_data.get('twilio_sid'),
                                     "token": business_data.get('twilio_token'),
                                     "number": business_data.get('twilio_number')
                                 } if business_data.get('twilio_sid') else None
                                 
                                 send_whatsapp_response(owner_phone, msg, twilio_config)
                    except Exception as ex:
                        logger.error(f"Failed to send stop alert to owner: {ex}")

                    logger.warning(f"Business {negocio_id} has reached its WhatsApp message limit ({wa_limit}) and has no credits")
                    return {"status": "limit_reached", "reason": "operational_limit_exceeded"}
        
            # 2.1 Check for Low Balance (50 messages left)
            remaining_plan = max(0, wa_limit - wa_count)
            total_remaining = remaining_plan + wa_credits
            
            if total_remaining == 50:
                 try:
                    # Get owner phone
                    owner_res = supabase.table('users').select('telefono').eq('negocio_id', negocio_id).limit(1).execute()
                    if owner_res.data:
                         owner_phone = owner_res.data[0].get('telefono')
                         if owner_phone:
                             msg = f"⚠️ AVISO MENU.IA: Te quedan solo 50 mensajes disponibles.\nTu agente IA podría detenerse pronto.\n\nOpciones:\n1. Adquiere un Pack de Mensajes.\n2. Sube de Plan para más capacidad.\n\nRecarga aquí: https://menuia.co/dashboard/{business_data.get('slug')}/marketing"
                             
                             twilio_config = {
                                 "sid": business_data.get('twilio_sid'),
                                 "token": business_data.get('twilio_token'),
                                 "number": business_data.get('twilio_number')
                             } if business_data.get('twilio_sid') else None
                             
                             send_whatsapp_response(owner_phone, msg, twilio_config)
                 except Exception as ex:
                    logger.error(f"Failed to send low balance alert: {ex}")

        # 3. Procesar con IA
        response_text = await process_whatsapp_message(message_body, sender_phone, negocio_id)
        
        # 4. Enviar respuesta y actualizar contador
        if response_text:
            twilio_config = None
            if business_data and business_data.get('twilio_sid'):
                twilio_config = {
                    "sid": business_data.get('twilio_sid'),
                    "token": business_data.get('twilio_token'),
                    "number": business_data.get('twilio_number')
                }

            send_whatsapp_response(sender_phone, response_text, twilio_config)
            
            # Actualizar contador o créditos (solo si hay negocio)
            if business_data:
                if use_credits:
                    supabase.table('negocios').update({
                        "wa_credits": wa_credits - 1
                    }).eq('id', negocio_id).execute()
                else:
                    update_data = {"wa_messages_count": wa_count + 1}
                    if biz_plan == 'trial':
                        update_data["ai_credits_wa_used"] = business_data.get('ai_credits_wa_used', 0) + 1
                    supabase.table('negocios').update(update_data).eq('id', negocio_id).execute()
            
        return {"status": "processed", "response": response_text}

    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        logger.error(traceback.format_exc())
        return {"status": "error", "detail": f"{str(e)} - {traceback.format_exc()}"}


# ============ WEBSOCKET FOR REALTIME ============
@app.websocket("/ws/{negocio_id}")
async def websocket_endpoint(websocket: WebSocket, negocio_id: str):
    await manager.connect(websocket, negocio_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, negocio_id)


# ============ GEMINI INSIGHTS ============
genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))

@api_router.get("/gemini/insights/{negocio_id}")
async def get_ai_insights(negocio_id: str, business: Business = Depends(get_current_business)):
    if business.id != negocio_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # PLAN CHECK: Insights requires 'pro' or 'elite'
    if business.plan in ['trial', 'impulso', 'free']:
        # Return a dummy response or error depending on frontend handling
        # For insights, we return a structured error that the frontend can display nicely
        return {
            "resumen_dia": {"ventas": 0, "pedidos": 0, "ticket_promedio": 0},
            "top_platos": [],
            "horas_pico": [],
            "mesas_alerta": [],
            "meseros_top": [],
            "acciones_sugeridas": [
                "🔒 **FUNCIÓN PREMIUM:** El análisis con IA está disponible en los planes Pro y Business.",
                "💡 **ACTUALIZA TU PLAN:** Obtén insights detallados para mejorar tu rentabilidad.",
                "🚀 ve a Configuración > Suscripción para mejorar tu plan."
            ],
            "tendencias_semana": {"dia_mas_fuerte": "N/A", "categoria_en_crecimiento": "N/A"}
        }

    try:
        # 1. Recopilar datos de las últimas 24 horas
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)
        week_ago = now - timedelta(days=7)

        # Usar consultas paralelas si fuera posible, por ahora secuencial es seguro
        pedidos_dia = supabase.table('pedidos').select('*').match({"negocio_id": negocio_id}).gte('created_at', yesterday.isoformat()).execute()
        pedidos_semana = supabase.table('pedidos').select('total, created_at').match({"negocio_id": negocio_id}).gte('created_at', week_ago.isoformat()).execute()
        
        mesas = supabase.table('mesas').select('*').eq('negocio_id', negocio_id).execute()
        productos_top = supabase.table('productos').select('nombre, precio, categoria').eq('negocio_id', negocio_id).limit(10).execute()
        empleados = supabase.table('empleados').select('nombre, rol').eq('negocio_id', negocio_id).execute()

        # 2. Construir contexto para Gemini
        context = {
            "fecha_actual": now.strftime("%Y-%m-%d %H:%M"),
            "resumen_24h": {
                "total_ventas": sum(float(p.get('total', 0)) for p in pedidos_dia.data),
                "cantidad_pedidos": len(pedidos_dia.data),
                "pedidos": [{"hora": p['created_at'], "total": p['total'], "items": len(p['items'])} for p in pedidos_dia.data]
            },
            "resumen_semana": {
                "total_ventas": sum(float(p.get('total', 0)) for p in pedidos_semana.data),
                "cantidad_pedidos": len(pedidos_semana.data)
            },
            "estado_actual": {
                "mesas_ocupadas": len([m for m in mesas.data if m['estado'] != 'libre']),
                "mesas_totales": len(mesas.data),
                "empleados_activos": len(empleados.data)
            },
            "catalogo_muestra": productos_top.data
        }

        # 3. Llamar a IA (Gemini con Fallback a OpenAI)
        prompt = f"""Actúa como un analista de negocios experto para restaurantes.
            Analiza estos datos operativos y genera insights estratégicos en formato JSON.
            
            DATOS:
            {json.dumps(context, default=str)}

            REQUISITOS:
            1. Responde SOLO con un JSON válido. NO uses bloques de código markdown (```json).
            2. El JSON debe tener esta estructura exacta:
            {{
              "resumen_dia": {{ "ventas": number, "pedidos": number, "ticket_promedio": number }},
              "top_platos": [ {{ "nombre": string, "ventas": number, "ingreso": number }} ], 
              "horas_pico": [ "HH:MM-HH:MM" ],
              "mesas_alerta": [ {{ "mesa": number, "espera_promedio_min": number, "motivo": string }} ], 
              "meseros_top": [ {{ "nombre": string, "pedidos_atendidos": number }} ],
              "acciones_sugeridas": [ 
                  "**PROBLEMA:** descripición detallada del problema... **SOLUCIÓN:** descripción detallada de la estrategia a seguir...",
                  "**PROBLEMA:** ... **SOLUCIÓN:** ...",
                  "**PROBLEMA:** ... **SOLUCIÓN:** ..."
              ],
              "tendencias_semana": {{ "dia_mas_fuerte": string, "categoria_en_crecimiento": string }}
            }}
            3. Sé extremadamente detallado y profundo. No des consejos genéricos, USA LOS DATOS PROPORCIONADOS.
            4. Cada acción sugerida DEBE seguir estrictamente el formato **PROBLEMA:** ... **SOLUCIÓN:** ..."""

        try:
            # --- TRY GEMINI FIRST ---
            logger.info("Intentando generar insights con Gemini...")
            models_to_try = ['gemini-2.0-flash', 'gemini-1.5-flash']
            success = False
            
            for model_name in models_to_try:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    clean_text = response.text.replace('```json', '').replace('```', '').strip()
                    return json.loads(clean_text)
                except Exception as e:
                    logger.warning(f"Insights: {model_name} falló: {e}")
                    continue
            
            if not success:
                raise Exception("Gemini falló en todos los modelos para insights")

        except Exception as gemini_err:
            logger.warning(f"Gemini falló en Insights: {str(gemini_err)}. Usando respaldo OpenAI...")
            
            try:
                # --- FALLBACK TO OPENAI ---
                client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
                res = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Eres un analista de restaurantes que responde solo en JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={ "type": "json_object" }
                )
                return json.loads(res.choices[0].message.content)
            
            except Exception as openai_err:
                logger.error(f"Error CRÍTICO en ambos proveedores de IA para Insights: {str(openai_err)}")
                raise openai_err

    except Exception as e:
        logger.error(f"Error generando insights: {str(e)}")
        # Fallback TOTAL en caso de que ambos fallen
        return {
            "resumen_dia": {"ventas": 0, "pedidos": 0, "ticket_promedio": 0},
            "top_platos": [],
            "horas_pico": [],
            "mesas_alerta": [],
            "meseros_top": [],
            "acciones_sugeridas": [
                "⚠️ Los servicios de IA están temporalmente fuera de línea.",
                "💡 Revisa tu conexión a internet o intenta más tarde.",
                "📈 Seguimos registrando tus ventas con normalidad."
            ],
            "tendencias_semana": {"dia_mas_fuerte": "-", "categoria_en_crecimiento": "-"}
        }

# --- AI IMAGE GENERATION ---
class ProductImageRequest(BaseModel):
    nombre: str
    descripcion: str

@api_router.post("/ai/generate-product-image")
async def generate_product_image_endpoint(req: ProductImageRequest, business: Business = Depends(get_current_business)):
    # Deduct credit
    deduct_ai_credit(business.id, 'img', business)
    try:
        # Prompt enhancement with Gemini Flash (most stable in this environment)
        genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        prompt_refinement = f"""
        Actúa como un experto en fotografía publicitaria de alimentos.
        Genera un prompt detallado para DALL-E 3 para crear una imagen profesional del siguiente producto:
        "{req.nombre}" - {req.descripcion if req.descripcion else 'Un plato delicioso'}
        
        El prompt debe:
        1. Ser en inglés.
        2. Describir la iluminación profesional de estudio.
        3. Describir el fondo desenfocado (bokeh).
        4. Enfocarse en la frescura y textura.
        5. NO incluir ningún texto, logos o marca de agua.
        """
        
        # Generar el prompt refinado usando el modelo de Gemini
        res_refinement = model.generate_content(prompt_refinement)
        enhanced_prompt = res_refinement.text.strip()
        
        if not enhanced_prompt:
             enhanced_prompt = f"Professional food photography of {req.nombre}, studio lighting, highly detailed."
             
        # Generate image with OpenAI's GPT Image 1 Mini (Much more cost-efficient)
        openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        img_gen_res = openai_client.images.generate(
            model="gpt-image-1-mini",
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="low",
            n=1,
        )
        
        dalle_url = img_gen_res.data[0].url
        b64_data = img_gen_res.data[0].b64_json
        
        image_bytes = None
        
        if b64_data:
            import base64
            image_bytes = base64.b64decode(b64_data)
        elif dalle_url:
            # Download and save to Supabase
            import httpx
            async with httpx.AsyncClient() as http_client:
                img_res = await http_client.get(dalle_url, timeout=30.0)
                if img_res.status_code != 200:
                    raise HTTPException(status_code=500, detail="Fallo al obtener la imagen de la IA")
                
                image_bytes = img_res.content
        
        if not image_bytes:
             raise HTTPException(status_code=500, detail="No se pudo obtener el contenido de la imagen de la IA")
             
        file_ext = "png"
        file_name = f"{business.id}/ai-{uuid.uuid4()}.{file_ext}"
        
        # Upload to Supabase Storage
        supabase.storage.from_('menupro').upload(
            path=file_name,
            file=image_bytes,
            file_options={"content-type": f"image/{file_ext}"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_('menupro').get_public_url(file_name)
        
        return {"url": public_url}
        
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"Error generating AI image: {tb}")
        with open("debug_ai_error.txt", "w") as f:
            f.write(tb)
        raise HTTPException(status_code=500, detail=f"Error en la generación de imagen: {str(e)}")

class ProductDescriptionRequest(BaseModel):
    nombre: str

@api_router.post("/ai/generate-product-description")
async def generate_product_description_endpoint(req: ProductDescriptionRequest, business: Business = Depends(get_current_business)):
    # Deduct credit
    deduct_ai_credit(business.id, 'desc', business)
    try:
        genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        prompt = f"""
        Actúa como redactor de menús para un restaurante.
        Voy a darte solo el nombre de un producto y tú debes inventar una descripción corta y sencilla que explique claramente qué es el producto y qué incluye.

        Requisitos de la descripción:
        - En español.
        - 1 sola frase, máximo 1 renglón.
        - Tono simple y descriptivo, sin palabras rebuscadas.
        - Menciona tipo de preparación y los ingredientes o componentes más probables según el nombre.
        - No inventes características exageradas (no digas “el mejor”, “increíble”, etc.).
        - No repitas el nombre del producto más de una vez.

        Ejemplo de estilo de salida:
        Entrada: “Hamburguesa de carne doble Pequeña”
        Salida: “Hamburguesa con dos porciones pequeñas de carne 100% de res, jugosas y bien sazonadas, servidas en pan fresco con queso, vegetales frescos y salsas de la casa, ideal para quien busca gran sabor en un tamaño compacto.”

        Ahora responde SOLO con la descripción, sin explicaciones ni texto adicional.

        Nombre del producto: {req.nombre}
        """
        
        response = model.generate_content(prompt)
        description = response.text.strip()
        
        return {"description": description}
    except Exception as e:
        logger.error(f"Error generating AI description: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error en la generación de descripción: {str(e)}")



# --- GEMINI CHAT ENDPOINT ---

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []

@api_router.post("/gemini/audio/{negocio_id}")
async def chat_audio_with_consultant(negocio_id: str, audio: UploadFile = File(...), business: Business = Depends(get_current_business)):
    if business.id != negocio_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # PLAN CHECK
    if business.plan in ['trial', 'impulso', 'free']:
         return {"reply": "🔒 Esta función es exclusiva de los planes Pro y Elite."}

    try:
        # Context gathering
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)
        pedidos_res = supabase.table('pedidos').select('total').eq('negocio_id', negocio_id).gte('created_at', yesterday.isoformat()).execute()
        mesas_res = supabase.table('mesas').select('estado').eq('negocio_id', negocio_id).execute()
        
        ventas_hoy = sum(float(p.get('total', 0)) for p in pedidos_res.data) if pedidos_res.data else 0
        pedidos_hoy = len(pedidos_res.data) if pedidos_res.data else 0
        mesas_ocupadas = len([m for m in mesas_res.data if m.get('estado') == 'ocupada']) if mesas_res.data else 0
        total_mesas = len(mesas_res.data) if mesas_res.data else 0
        
        system_instructions = get_shared_instructions(
            business.nombre, 
            ventas_hoy, 
            pedidos_hoy, 
            f"{mesas_ocupadas} de {total_mesas} ocupadas"
        )

        audio_content = await audio.read()
        
        # Initialize OpenAI for Transcription (Whisper is excellent)
        from openai import OpenAI
        openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
            
        try:
            with open(tmp_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            user_text = transcript.text.strip()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not user_text:
             return {"reply": "No pude escuchar bien tu audio. ¿Podrías repetirlo?"}

        # --- GENERATE RESPONSE ---
        try:
            # TRY GEMINI FIRST
            genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
            models_to_try = ['models/gemini-2.5-flash', 'models/gemini-1.5-flash']
            
            for model_name in models_to_try:
                try:
                    model = genai.GenerativeModel(model_name, system_instruction=system_instructions)
                    response = model.generate_content(user_text)
                    return {"reply": response.text, "provider": f"gemini-{model_name}"}
                except Exception as e:
                    logger.warning(f"Consultant audio: {model_name} falló: {e}")
                    continue

            # FALLBACK TO OPENAI
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": user_text}
                ]
            )
            return {"reply": response.choices[0].message.content, "provider": "openai-whisper-gpt"}
            
        except Exception as ai_err:
            logger.error(f"Error AI: {ai_err}")
            return {"reply": "Lo siento, tuve un problema procesándolo."}

    except Exception as e:
        logger.error(f"Error in consultant audio: {e}")
        logger.error(traceback.format_exc())
        return {"reply": "Lo siento, tuve un problema procesando tu audio de consulta."}

@api_router.post("/gemini/chat/{negocio_id}")
async def chat_with_consultant(negocio_id: str, request: ChatRequest, business: Business = Depends(get_current_business)):
    if business.id != negocio_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # PLAN CHECK: Consultant requires 'pro' or 'elite'
    if business.plan in ['trial', 'impulso', 'free']:
         return {"reply": "🔒 Esta función es exclusiva de los planes Pro y Elite. Por favor actualiza tu plan para chatear con el consultor IA."}

    try:
        # 1. Gather Context (Lighter version of Insights)
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)
        
        # Basic stats for context
        # Optimized query, select specific fields
        pedidos_res = supabase.table('pedidos').select('total').eq('negocio_id', negocio_id).gte('created_at', yesterday.isoformat()).execute()
        mesas_res = supabase.table('mesas').select('estado').eq('negocio_id', negocio_id).execute()
        
        if not pedidos_res.data:
            pedidos_res.data = []
            
        ventas_hoy = sum(float(p.get('total', 0)) for p in pedidos_res.data)
        pedidos_hoy = len(pedidos_res.data)
        mesas_ocupadas = len([m for m in mesas_res.data if m.get('estado') == 'ocupada'])
        total_mesas = len(mesas_res.data)
        
        # Shared context
        system_instructions = get_shared_instructions(
            business.nombre, 
            ventas_hoy, 
            pedidos_hoy, 
            f"{mesas_ocupadas} de {total_mesas} ocupadas"
        )

        chat_history = []
        for msg in request.history:
             role = "user" if msg.get("role") == "user" else "model"
             content = msg.get("content", "")
             if content:
                 chat_history.append({"role": role, "parts": [content]})

        try:
            # --- TRY GEMINI FIRST ---
            logger.info("Intentando chat con Gemini...")
            
            # List of models to try in order of preference
            models_to_try = [
                'models/gemini-2.5-flash', 
                'models/gemini-2.0-flash', 
                'models/gemini-1.5-flash',
                'gemini-1.5-flash'
            ]
            response = None
            
            for model_name in models_to_try:
                try:
                    genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
                    model = genai.GenerativeModel(model_name, system_instruction=system_instructions)
                    chat = model.start_chat(history=chat_history)
                    response = chat.send_message(request.message)
                    return {"reply": response.text, "provider": f"gemini-{model_name}"}
                except Exception as e:
                    logger.warning(f"Consultancy chat: {model_name} falló: {e}")
                    continue
            
            if not response:
                raise Exception("No se pudo conectar con ningún modelo de Gemini")
            
        except Exception as gemini_err:
            logger.warning(f"Gemini falló: {str(gemini_err)}. Usando respaldo OpenAI...")
            
            # --- FALLBACK TO OPENAI ---
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            
            # Map history for OpenAI
            openai_history = [{"role": "system", "content": system_instructions}]
            for msg in request.history:
                openai_history.append({
                    "role": "user" if msg.get("role") == "user" else "assistant",
                    "content": msg.get("content", "")
                })
            openai_history.append({"role": "user", "content": request.message})
            
            res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=openai_history
            )
            return {"reply": res.choices[0].message.content, "provider": "openai"}

    except Exception as e:
        logger.error(f"Error CRÍTICO en ambos proveedores de IA: {str(e)}")
        logger.error(traceback.format_exc())
        return {"reply": get_fallback_message()}

class NutritionRequest(BaseModel):
    name: str
    description: Optional[str] = ""

@api_router.post("/gemini/nutrition")
async def analyze_nutrition(request: NutritionRequest, business: Business = Depends(get_current_business)):
    # Deduct credit
    deduct_ai_credit(business.id, 'nutri', business)
    prompt = f"""
    Como experto nutricionista, analiza el siguiente plato y estima sus valores nutricionales aproximados para una porción estándar.
    Plato: {request.name}
    Descripción: {request.description}
    
    Responde ÚNICAMENTE en formato JSON con la siguiente estructura (los valores deben ser números o strings cortos):
    {{
        "kcal": int,
        "proteina": "string (ej: 25g)",
        "carbohidratos": "string (ej: 40g)",
        "grasa": "string (ej: 15g)"
    }}
    """
    
    try:
        genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        
        # Clean response if it contains markdown
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        return data
    except Exception as e:
        logger.error(f"Error en análisis nutricional IA: {e}")
        # En caso de error, devolver valores neutros para no romper el front
        return {"kcal": 0, "proteina": "0g", "carbohidratos": "0g", "grasa": "0g"}

# --- LANDING PAGE CHAT AGENT ---

class LandingChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []

@api_router.post("/public/landing-audio")
async def public_landing_audio(audio: UploadFile = File(...)):
    # System prompt for prospective business owners
    system_instructions = """
    Eres el Asistente Experto (VOCAL) de Menu.IA, un consultor para dueños de negocios en Colombia.
    Tu objetivo es convencer a los dueños de negocios de las ventajas de Menu.IA y dar información exacta sobre los precios.

    PLANES Y PRECIOS OFICIALES (Mensual):
    - Básico: $39.900 COP/mes (100 pedidos y 500 mensajes).
    - Pro: $111.900 COP/mes (400 pedidos y 1.500 mensajes - El más popular).
    - Premium: $209.900 COP/mes (Pedidos ilimitados y 3.000 mensajes).

    PACKS DE WHATSAPP (Recargas Prepago):
    
    1. PACKS DE VENTA/SOPORTE (Para el agente que conversa y toma pedidos):
    - 1.000 mensajes / $59.900 COP.
    - 3.000 mensajes / $163.900 COP.
    - 6.000 mensajes / $299.900 COP.

    2. PACKS DE CAMPAÑAS MASIVAS (Para marketing masivo y anuncios):
    - 1.000 mensajes / $150.000 COP.
    - 5.000 mensajes / $725.000 COP.
    - 10.000 mensajes / $1.400.000 COP.

    REGLAS:
    - SI PREGUNTAN POR PRECIOS O PACKS, DI LOS PRECIOS EXACTOS ANTERIORES.
    - Menciona características clave como Pedidos, Mensajes y Agente IA.
    - No seas vago. Invítalos a registrarse en menuia.co/register.
    - Responde en español con un tono profesional y motivador.
    """
    
    try:
        audio_content = await audio.read()
        
        # Initialize OpenAI Client for Transcription
        from openai import OpenAI
        openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
            
        try:
            with open(tmp_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            user_text = transcript.text.strip()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not user_text:
             return {"reply": "No pude escuchar bien tu audio. ¿Podrías repetirlo?"}

        # --- GENERATE RESPONSE ---
        try:
            # TRY GEMINI FIRST
            genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
            models_to_try = ['models/gemini-2.5-flash', 'models/gemini-1.5-flash']
            
            for model_name in models_to_try:
                try:
                    model = genai.GenerativeModel(model_name, system_instruction=system_instructions)
                    response = model.generate_content(user_text)
                    return {"reply": response.text, "provider": f"gemini-{model_name}"}
                except Exception as e:
                    logger.warning(f"Landing audio: {model_name} falló: {e}")
                    continue

            # FALLBACK TO OPENAI
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": user_text}
                ]
            )
            return {"reply": response.choices[0].message.content, "provider": "openai-whisper-gpt"}
        except Exception as ai_err:
            logger.error(f"Error AI Landing Audio: {ai_err}")
            return {"reply": "Lo siento, tuve un problema técnico procesando tu audio."}

    except Exception as e:
        logger.error(f"Error in landing audio: {e}")
        logger.error(traceback.format_exc())
        return {"reply": "Lo siento, tuve un problema procesándolo."}

@api_router.post("/public/landing-chat")
async def public_landing_chat(request: LandingChatRequest):
    # System prompt for prospective business owners
    system_instructions = """
    Eres el Asistente Experto de Menu.IA, un consultor para dueños de negocios del sector gastronómico (restaurantes, cafés, bares, etc.) en Colombia.
    Tu objetivo es convencer a los dueños de negocios de las ventajas de usar nuestra plataforma y resolver sus dudas técnicas o comerciales de forma profesional, amable y persuasiva.

    INFORMACIÓN CLAVE DE MENU.IA:
    - Qué es: Plataforma de gestión inteligente para restaurantes.
    - Funciones Principales:
        * Menú QR Inteligente: Los clientes piden desde su celular sin apps.
        * Pantalla de Cocina (KDS): Gestión eficiente de pedidos en cocina.
        * App de Meseros: Toma de pedidos rápida desde cualquier dispositivo.
        * WhatsApp Integrado: Notificaciones automáticas y atención por IA.
        * Analítica Avanzada: Reportes de ventas, platos top y rendimiento.
        * Fidelización: Sistema de puntos ajustable por el negocio.

    PLANES Y PRECIOS (Pesos Colombianos - COP / Mensual):
    1. PLAN BÁSICO ($39.900 COP/mes):
        - 100 Pedidos al mes.
        - 500 Mensajes de Venta/Soporte.
        - Menú Digital Interactivo y Código QR Personalizado.
        - Pedidos en Mesa y Domicilio con Seguimiento.
        - Agente IA WhatsApp (Versión Básica).

    2. PLAN PRO ($111.900 COP/mes) - EL MÁS POPULAR:
        - 400 Pedidos al mes.
        - 1.500 Mensajes de Venta/Soporte.
        - Todo lo del plan Básico.
        - Agente IA WhatsApp (Versión Avanzada).
        - Sistema de Fidelización por Puntos (Duntos).

    3. PLAN PREMIUM ($209.900 COP/mes) - ELITE:
        - Pedidos ILIMITADOS.
        - 3.000 Mensajes de Venta/Soporte.
        - Todo lo del plan Pro.
        - Agente IA WhatsApp (Versión Personalizada).
        - Sistema de Fidelización COMPLETO.

    RECARGAS WHATSAPP (Packs Prepago):

    1. PACKS DE VENTA/SOPORTE (Agente IA Interactivo y Pedidos):
    - 1.000 mensajes por $59.900 COP.
    - 3.000 mensajes por $163.900 COP.
    - 6.000 mensajes por $299.900 COP.

    2. PACKS DE CAMPAÑAS MASIVAS (Marketing y Promociones):
    - 1.000 mensajes por $150.000 COP.
    - 5.000 mensajes por $725.000 COP.
    - 10.000 mensajes por $1.400.000 COP.

    REGLAS CRÍTICAS DE RESPUESTA:
    - SI PREGUNTAN POR PRECIOS: Enlista los 3 planes con sus precios y características principales.
    - SI PREGUNTAN POR WHATSAPP/CAMPAÑAS: Explica los packs de mensajes adicionales.
    - IMPORTANTE: No inventes precios. Usa solo los COP listados aquí.
    - PROHIBIDO ser vago ("opciones flexibles"). Responde con DATOS EXACTOS.

    ASESORÍA PERSONALIZADA (AGENDAMIENTO):
    - Si un cliente está interesado en una demo, asesoría personalizada o quiere que alguien le enseñe a usar la plataforma, DEBES ofrecerle agendar una cita.
    - IMPORTANTE: Para agendar, utiliza EXACTAMENTE el marcador [LINK_CALENDLY]. NO escribas el link real de Calendly en tu respuesta, el sistema lo reemplazará por un botón automáticamente.
    - Ejemplo de respuesta: "¡Claro! Me encantaría ayudarte. Puedes agendar nuestra reunión aquí: [LINK_CALENDLY]. La reunión será por Google Meet."

    REGLAS DE RESPUESTA:
    1. Sé profesional pero cercano. Usa un tono motivador.
    2. Resalta el ahorro de tiempo y el aumento de ventas gracias a la IA.
    3. Si preguntan algo que no sabes, invítalos a registrarse gratis para probar la plataforma en https://menuia.co/register.
    4. Cuando detectes interés en una demo o asesoría, incluye el marcador [LINK_CALENDLY] en tu respuesta.
    5. Usa emojis de forma moderada.
    6. No inventes precios o funciones que no estén listadas aquí.
    7. Tus respuestas deben ser en español.
    """

    chat_history = []
    for msg in request.history:
         role = "user" if msg.get("role") == "user" else "model"
         content = msg.get("content", "")
         if content:
             chat_history.append({"role": role, "parts": [content]})

    try:
        # Try Gemini with full model names including the officially working ones
        models_to_try = [
            'models/gemini-2.5-flash', 
            'models/gemini-2.0-flash', 
            'models/gemini-1.5-flash',
            'gemini-1.5-flash'
        ]
        
        for model_name in models_to_try:
            try:
                # Configure Gemini inside the try to ensure it uses the latest key if changed
                genai.configure(api_key=os.environ.get("GOOGLE_GEMINI_API_KEY"))
                model = genai.GenerativeModel(model_name, system_instruction=system_instructions)
                chat = model.start_chat(history=chat_history)
                response = chat.send_message(request.message)
                return {"reply": response.text, "provider": f"gemini-{model_name}"}
            except Exception as e:
                logger.warning(f"Landing chat: {model_name} falló: {e}")
                continue
                
        # If Gemini fails, fallback to OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        openai_history = [{"role": "system", "content": system_instructions}]
        for msg in request.history:
            openai_history.append({
                "role": "user" if msg.get("role") == "user" else "assistant",
                "content": msg.get("content", "")
            })
        openai_history.append({"role": "user", "content": request.message})
        
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_history
        )
        return {"reply": res.choices[0].message.content, "provider": "openai"}

    except Exception as e:
        logger.error(f"Error en Landing Chat: {str(e)}")
        logger.error(traceback.format_exc())
        return {"reply": "¡Hola! 👋 Soy el asistente de Menu.IA. Estoy experimentando mucha demanda, pero puedes registrarte gratis en nuestra página para conocer todos los beneficios."}


# ============ MERCADOPAGO SUBSCRIPTIONS ============

class SubscriptionRequest(BaseModel):
    plan_id: str # 'impulso', 'pro', 'elite'
    frequency: str = 'monthly' # 'monthly', 'annual'

class WhatsAppPackRequest(BaseModel):
    amount: int # 1000, 5000, 10000

@api_router.post("/payments/create-subscription")
async def create_subscription_link(data: SubscriptionRequest, business: Business = Depends(get_current_business)):
    """Generate a MercadoPago Preapproval (Subscription) Link"""
    if not os.environ.get("MERCADOPAGO_ACCESS_TOKEN"):
         raise HTTPException(status_code=503, detail="El sistema de pagos de MercadoPago no está configurado.")
    try:
        # Define Plan Details
        # NOTE: For production, better to fetch from DB or MP Plans API
        PLAN_DETAILS = {
            'impulso': {
                'reason': 'Plan Básico (Suscripción) - Menu.IA',
                'price_monthly': 39900,
                'price_annual': 399000, 
                'back_url': f"{os.environ.get('FRONTEND_URL')}/dashboard/{business.slug}/configuracion?status=success"
            },
            'pro': {
                'reason': 'Plan Pro (Suscripción) - Menu.IA',
                'price_monthly': 119900,
                'price_annual': 1199000,
                'back_url': f"{os.environ.get('FRONTEND_URL')}/dashboard/{business.slug}/configuracion?status=success"
            },
            'elite': {
                'reason': 'Plan Premium (Suscripción) - Menu.IA',
                'price_monthly': 209900,
                'price_annual': 2099000,
                'back_url': f"{os.environ.get('FRONTEND_URL')}/dashboard/{business.slug}/configuracion?status=success"
            }
        }
        
        selected_plan = PLAN_DETAILS.get(data.plan_id)
        if not selected_plan:
             raise HTTPException(status_code=400, detail="Plan no válido")
             
        amount = selected_plan['price_annual'] if data.frequency == 'annual' else selected_plan['price_monthly']
        
        # Create Preapproval Data
        payer_email = business.email if business.email else "soporte@menuia.co"
        
        subscription_data = {
            "reason": selected_plan['reason'],
            "external_reference": f"{business.id}:{data.plan_id}", # Identify User logic
            "payer_email": payer_email, 
            "auto_recurring": {
                "frequency": 1,
                "frequency_type": "months",
                "transaction_amount": amount,
                "currency_id": "COP"
            },
            "back_url": selected_plan['back_url'],
            "status": "pending"
        }
        
        # Adjust frequency for annual if needed. Usually frequency=12, frequency_type='months' implies billing every 12 months
        if data.frequency == 'annual':
             subscription_data['auto_recurring']['frequency'] = 12
        
        # Call SDK
        preference_response = mp_sdk.preapproval().create(subscription_data)
        preference = preference_response["response"]
        
        # Debug Log
        logger.info(f"MP Preference Created: {preference}")
        
        if "init_point" not in preference:
             raise HTTPException(status_code=500, detail="Error al conectar con MercadoPago")
             
        return {"init_point": preference["init_point"]}

    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/payments/create-payment-link")
async def create_payment_link(data: SubscriptionRequest, business: Business = Depends(get_current_business)):
    """Generate a MercadoPago Preference Link (For PSE, Nequi, etc - Single Payment)"""
    if not os.environ.get("MERCADOPAGO_ACCESS_TOKEN"):
         raise HTTPException(status_code=503, detail="El sistema de pagos de MercadoPago no está configurado.")
    try:
        # Define Plan Details
        PLAN_DETAILS = {
            'impulso': {
                'reason': 'Plan Básico (Mes Prepago) - Menu.IA',
                'price_monthly': 39900,
                'price_annual': 399000
            },
            'pro': {
                'reason': 'Plan Pro (Mes Prepago) - Menu.IA',
                'price_monthly': 119900,
                'price_annual': 1199000
            },
            'elite': {
                'reason': 'Plan Premium (Mes Prepago) - Menu.IA',
                'price_monthly': 209900,
                'price_annual': 2099000
            }
        }
        
        selected_plan = PLAN_DETAILS.get(data.plan_id)
        if not selected_plan:
             raise HTTPException(status_code=400, detail="Plan no válido")
             
        amount = selected_plan['price_annual'] if data.frequency == 'annual' else selected_plan['price_monthly']
        
        # Create Preference Payload
        payer_email = business.email if business.email else "soporte@menuia.co"
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        preference_data = {
            "items": [
                {
                    "title": selected_plan['reason'],
                    "quantity": 1,
                    "unit_price": amount,
                    "currency_id": "COP"
                }
            ],
            "payer": {
                "email": payer_email
            },
            "external_reference": f"{business.id}:{data.plan_id}:{data.frequency}",
            "back_urls": {
                "success": f"{frontend_url}/dashboard/{business.slug}/configuracion?status=success",
                "failure": f"{frontend_url}/dashboard/{business.slug}/configuracion?status=failure",
                "pending": f"{frontend_url}/dashboard/{business.slug}/configuracion?status=pending"
            }
        }

        # MercadoPago Colombia requires HTTPS and non-localhost for auto_return
        if frontend_url.startswith('https://') and 'localhost' not in frontend_url:
            preference_data["auto_return"] = "approved"

        # Solo añadir notification_url si es una URL pública válida (HTTPS)
        backend_url = os.environ.get('BACKEND_URL', '')
        if backend_url.startswith('https://'):
            preference_data["notification_url"] = f"{backend_url}/api/payments/webhook"
        
        # Call SDK to create preference
        preference_response = mp_sdk.preference().create(preference_data)
        
        if preference_response["status"] < 200 or preference_response["status"] >= 300:
             logger.error(f"MercadoPago Error: {preference_response}")
             raise HTTPException(status_code=500, detail=f"Error en MercadoPago: {preference_response.get('response', {}).get('message', 'Sin mensaje')}")

        preference = preference_response["response"]
        
        if "init_point" not in preference:
             logger.error(f"MercadoPago response missing init_point: {preference}")
             raise HTTPException(status_code=500, detail="Error al crear preferencia en MercadoPago (missing init_point)")
             
        return {"init_point": preference["init_point"]}

    except Exception as e:
        logger.error(f"Error creating single payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/payments/create-wa-pack-link")
async def create_wa_pack_link(data: WhatsAppPackRequest, business: Business = Depends(get_current_business)):
    """Generate a MercadoPago Preference Link for WhatsApp Message Packs"""
    if not os.environ.get("MERCADOPAGO_ACCESS_TOKEN"):
         raise HTTPException(status_code=503, detail="El sistema de pagos de MercadoPago no está configurado.")
    try:
        # Updated pricing for packs (Price in COP)
        PACK_PRICING = {
            1000: 150000,
            5000: 725000,
            10000: 1400000
        }
        
        price = PACK_PRICING.get(data.amount)
        if not price:
             raise HTTPException(status_code=400, detail="Cantidad de mensajes no válida")
             
        # Create Preference Payload
        payer_email = business.email if business.email else "soporte@menuia.co"
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        preference_data = {
            "items": [
                {
                    "title": f"Pack de {data.amount:,} Mensajes WhatsApp - Menu.IA",
                    "quantity": 1,
                    "unit_price": price,
                    "currency_id": "COP"
                }
            ],
            "payer": {
                "email": payer_email
            },
            "external_reference": f"PACK:{business.id}:{data.amount}",
            "back_urls": {
                "success": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=success",
                "failure": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=failure",
                "pending": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=pending"
            }
        }

        # MercadoPago Colombia requires HTTPS and non-localhost for auto_return
        if frontend_url.startswith('https://') and 'localhost' not in frontend_url:
            preference_data["auto_return"] = "approved"

        # Solo añadir notification_url si es una URL pública válida (HTTPS)
        backend_url = os.environ.get('BACKEND_URL', '')
        if backend_url.startswith('https://'):
            preference_data["notification_url"] = f"{backend_url}/api/payments/webhook"
        
        logger.info(f"Creating MP preference for business {business.id}, amount: {data.amount}")
        logger.info(f"Preference data: {json.dumps(preference_data, indent=2)}")
        preference_response = mp_sdk.preference().create(preference_data)
        
        if preference_response["status"] >= 400:
            error_detail = preference_response.get("response", "No response data")
            logger.error(f"MercadoPago Error ({preference_response['status']}): {error_detail}")
            raise HTTPException(status_code=400, detail=f"Error de MercadoPago: {error_detail}")

        preference = preference_response["response"]
        
        if "init_point" not in preference:
            logger.error(f"MercadoPago response missing init_point: {preference}")
            raise HTTPException(status_code=500, detail="La respuesta de MercadoPago no contiene el link de pago.")

        return {"init_point": preference["init_point"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating WA pack payment: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/create-support-pack-link")
async def create_support_pack_link(data: WhatsAppPackRequest, business: Business = Depends(get_current_business)):
    """Generate a MercadoPago Preference Link for WhatsApp Support Packs"""
    if not os.environ.get("MERCADOPAGO_ACCESS_TOKEN"):
         raise HTTPException(status_code=503, detail="El sistema de pagos de MercadoPago no está configurado.")
    try:
        SUPPORT_PRICING = {
            1000: 59900,
            3000: 163900,
            6000: 299900
        }
        
        price = SUPPORT_PRICING.get(data.amount)
        if not price:
             raise HTTPException(status_code=400, detail="Cantidad de mensajes de soporte no válida")
             
        payer_email = business.email if business.email else "soporte@menuia.co"
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        preference_data = {
            "items": [
                {
                    "title": f"Pack Soporte de {data.amount:,} Mensajes WhatsApp - Menu.IA",
                    "quantity": 1,
                    "unit_price": price,
                    "currency_id": "COP"
                }
            ],
            "payer": {
                "email": payer_email
            },
            "external_reference": f"SUPPORT_PACK:{business.id}:{data.amount}",
            "back_urls": {
                "success": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=success",
                "failure": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=failure",
                "pending": f"{frontend_url}/dashboard/{business.slug}/whatsapp?status=pending"
            }
        }

        if frontend_url.startswith('https://') and 'localhost' not in frontend_url:
            preference_data["auto_return"] = "approved"

        backend_url = os.environ.get('BACKEND_URL', '')
        if backend_url.startswith('https://'):
            preference_data["notification_url"] = f"{backend_url}/api/payments/webhook"
        
        preference_response = mp_sdk.preference().create(preference_data)
        
        if preference_response["status"] >= 400:
            error_detail = preference_response.get("response", "No response data")
            logger.error(f"MercadoPago Error ({preference_response['status']}): {error_detail}")
            raise HTTPException(status_code=400, detail=f"Error de MercadoPago: {error_detail}")

        preference = preference_response["response"]
        
        if "init_point" not in preference:
            raise HTTPException(status_code=500, detail="La respuesta de MercadoPago no contiene el link de pago.")

        return {"init_point": preference["init_point"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Support pack payment: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/payments/webhook")
async def mercadopago_webhook(request: Request):
    try:
        data = await request.json()
        logger.info(f"Webhook received: {data}")
        
        topic = request.query_params.get("topic") or data.get("type")
        resource_id = request.query_params.get("id") or data.get("data", {}).get("id")

        if topic == "preapproval":
             # Handle Subscriptions
             sub_res = mp_sdk.preapproval().get(resource_id)
             sub_data = sub_res["response"]
             external_ref = sub_data.get("external_reference")
             status = sub_data.get("status")
             
             if external_ref and ":" in external_ref:
                 parts = external_ref.split(":")
                 business_id = parts[0]
                 plan_id = parts[1]
                 
                 new_plan = 'free'
                 if status == 'authorized':
                     new_plan = plan_id
                 
                 supabase.table('negocios').update({
                     'plan': new_plan,
                     'plan_expires_at': None # Subscriptions don't use this expiration usually
                 }).eq('id', business_id).execute()
                 logger.info(f"Subscription Webhook: Updated Business {business_id} to Plan {new_plan}")

        elif topic == "payment":
             # Handle Single Payments (PSE, Nequi)
             payment_res = mp_sdk.payment().get(resource_id)
             payment_data = payment_res["response"]
             
             status = payment_data.get("status")
             external_ref = payment_data.get("external_reference")
             
             if status == "approved" and external_ref:
                 parts = external_ref.split(":")
                 
                 if parts[0] == "PACK":
                     # Handle WhatsApp Pack Purchase
                     business_id = parts[1]
                     amount = int(parts[2])
                     
                     # Increment wa_credits
                     # Get current credits first to be safe (or use SQL increment)
                     supabase.rpc('increment_wa_credits', {
                         'row_id': business_id,
                         'val': amount
                     }).execute()
                     
                     # If RPC doesn't exist, we can do a normal update (less atomic but works for now)
                     res = supabase.table('negocios').select('wa_credits').eq('id', business_id).single().execute()
                     current = res.data.get('wa_credits', 0) if res.data else 0
                     
                     supabase.table('negocios').update({
                         'wa_credits': current + amount
                     }).eq('id', business_id).execute()
                     
                     logger.info(f"Pack Webhook: Added {amount} credits to Business {business_id}")
                
                 elif parts[0] == "SUPPORT_PACK":
                     # Handle WhatsApp Support Pack Purchase
                     business_id = parts[1]
                     amount = int(parts[2])
                     
                     # Increment wa_messages_limit
                     res = supabase.table('negocios').select('wa_messages_limit').eq('id', business_id).single().execute()
                     current = res.data.get('wa_messages_limit', 0) if res.data else 0
                     
                     supabase.table('negocios').update({
                         'wa_messages_limit': current + amount
                     }).eq('id', business_id).execute()
                     
                     logger.info(f"Support Pack Webhook: Added {amount} to wa_messages_limit for Business {business_id}")
                
                 elif len(parts) >= 2:
                     # Handle Plan Payment (Old Logic)
                     business_id = parts[0]
                     plan_id = parts[1]
                     frequency = parts[2] if len(parts) > 2 else 'monthly'
                     
                     from datetime import datetime, timedelta
                     now = datetime.now()
                     expiration = now + timedelta(days=365 if frequency == 'annual' else 31)
                     
                     # Set default limits based on plan
                     limits = {
                         'impulso': 500,
                         'pro': 1500,
                         'elite': 5000
                     }
                     
                     supabase.table('negocios').update({
                         'plan': plan_id,
                         'plan_expires_at': expiration.isoformat(),
                          'wa_messages_limit': limits.get(plan_id, 500)
                     }).eq('id', business_id).execute()
                     logger.info(f"Payment Webhook: Updated {business_id} Plan to {plan_id} expiring {expiration}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook Error: {e}")
        return {"status": "error"}

# ============ CLIENT AUTH & PROFILE ROUTES ============

@api_router.post("/auth/client/request-otp")
async def request_otp(data: OTPRequest):
    phone = data.telefono.replace(' ', '').replace('+', '')
    
    # Generate 6 digit OTP
    import random
    otp = str(random.randint(100000, 999999))
    
    # Expires in 10 mins
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Log OTP for debugging
    try:
        with open("otp_log.txt", "a") as f:
            f.write(f"{datetime.now().isoformat()} - {phone} - {otp}\n")
    except:
        pass
    
    # Save to auth_otps
    try:
        supabase.table('auth_otps').insert({
            "telefono": phone,
            "otp_code": otp,
            "expires_at": expires.isoformat()
        }).execute()
        
        # Send via WhatsApp
        msg = f"Tu código de verificación para Menu.IA es: *{otp}*. No lo compartas con nadie."
        await send_whatsapp_message(phone, msg)
        
        return {"message": "OTP enviado"}
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        # For development, if sending fails (e.g. no twilio), we might want to log OTP to console
        logger.info(f"DEV OTP for {phone}: {otp}")
        if os.environ.get('DEBUG') == 'True':
             return {"message": "OTP enviado (DEV MODE)", "otp_debug": otp}
        raise HTTPException(status_code=500, detail="Error al enviar OTP")

@api_router.post("/auth/client/verify-otp", response_model=ClientTokenResponse)
async def verify_otp(data: OTPVerify):
    phone = data.telefono.replace(' ', '').replace('+', '')
    
    # Check OTP
    res = supabase.table('auth_otps').select('*')\
        .eq('telefono', phone)\
        .eq('otp_code', data.otp)\
        .eq('used', False)\
        .gt('expires_at', datetime.now(timezone.utc).isoformat())\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()
        
    if not res.data:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
        
    # Mark as used (wait, Supabase might return error if RLS prevents update, but here we use service key so it's fine)
    otp_id = res.data[0]['id']
    supabase.table('auth_otps').update({'used': True}).eq('id', otp_id).execute()
    
    # Get or Create Client
    client_res = supabase.table('clientes').select('*').eq('telefono', phone).execute()
    
    if client_res.data:
        client_data = client_res.data[0]
    else:
        # Create new client
        new_client = {
            "telefono": phone,
            "nombre": "Nuevo Cliente", 
            "avatar_url": f"https://ui-avatars.com/api/?name=User&background=random"
        }
        create_res = supabase.table('clientes').insert(new_client).execute()
        if not create_res.data:
             raise HTTPException(status_code=500, detail="Error al crear cliente")
        client_data = create_res.data[0]
        
    # Generate Token
    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    expire = datetime.now(timezone.utc) + access_token_expires
    to_encode = {"sub": phone, "role": "client", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": encoded_jwt,
        "token_type": "bearer",
        "cliente": client_data
    }

@api_router.get("/client/me", response_model=Cliente)
async def get_client_profile(client: Cliente = Depends(get_current_client)):
    return client

@api_router.put("/client/me", response_model=Cliente)
async def update_client_profile(data: ClienteUpdate, client: Cliente = Depends(get_current_client)):
    # Remove None values
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    res = supabase.table('clientes').update(update_data).eq('id', client.id).execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Error actualizando perfil")
        
    return res.data[0]
    
@api_router.post("/client/upload-avatar")
async def upload_client_avatar(
    file: UploadFile = File(...),
    negocio_id: Optional[str] = Query(None), # Optional business context
    client: Cliente = Depends(get_current_client)
):
    try:
        # Generate unique filename
        file_ext = file.filename.split('.')[-1]
        unique_id = str(uuid.uuid4())
        file_name = f"{client.id}/{unique_id}.{file_ext}"

        # Upload
        content = await file.read()
        
        # Ensure bucket exists (simplified check)
        try:
             supabase.storage.create_bucket('avatars', options={"public": True})
        except:
             pass

        res = supabase.storage.from_('avatars').upload(
            file_name,
            content,
            {"content-type": file.content_type, "upsert": "true"}
        )
        
        # Get Public URL
        public_url = supabase.storage.from_('avatars').get_public_url(file_name)
        
        # Update Main Client Profile
        supabase.table('clientes').update({'avatar_url': public_url}).eq('id', client.id).execute()
        
        # If business context exists, also try to update business-specific customer record if it exists
        # This assumes there is a table linking clients and businesses (e.g. 'clientes_negocio' or similar)
        # Or that 'clientes' table is global but we want to ensure consistency.
        # Based on your prompt "enlaced to business", let's check if we need to update a specific 
        # table 'puntos_clientes' or similar which holds the business-customer relationship.
        
        if negocio_id:
             try:
                 supabase.table('puntos_clientes') \
                     .update({'avatar_url': public_url}) \
                     .eq('telefono', client.telefono) \
                     .eq('negocio_id', negocio_id) \
                     .execute()
             except Exception as e:
                 logger.warning(f"Could not update business-specific avatar: {e}")
        
        return {"url": public_url}

    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")

@api_router.get("/client/addresses", response_model=List[Address])
async def get_client_addresses(client: Cliente = Depends(get_current_client)):
    res = supabase.table('cliente_direcciones').select('*').eq('cliente_id', client.id).execute()
    return res.data

@api_router.post("/client/addresses", response_model=Address)
async def create_client_address(data: AddressCreate, client: Cliente = Depends(get_current_client)):
    payload = data.model_dump()
    payload['cliente_id'] = client.id
    
    # If principal, unset others
    if payload.get('es_principal'):
        supabase.table('cliente_direcciones').update({'es_principal': False}).eq('cliente_id', client.id).execute()
        
    res = supabase.table('cliente_direcciones').insert(payload).execute()
    return res.data[0]

@api_router.get("/client/orders")
async def get_client_orders(slug: str = None, client: Cliente = Depends(get_current_client)):
    query = supabase.table('pedidos').select('*').eq('cliente_telefono', client.telefono).order('created_at', desc=True)
    
    if slug:
        # Get business ID
        biz_res = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if biz_res.data:
            query = query.eq('negocio_id', biz_res.data[0]['id'])
            
    res = query.execute()
    orders = res.data
    
    if not orders:
        return []

    # Enrich with business info
    b_ids = list(set([o['negocio_id'] for o in orders if o.get('negocio_id')]))
    
    b_map = {}
    if b_ids:
        try:
            b_res = supabase.table('negocios').select('id, nombre, logo_url, slug').in_('id', b_ids).execute()
            for b in b_res.data:
                b_map[b['id']] = b
        except Exception as e:
            logger.error(f"Error fetching businesses for orders: {e}")
            
    for o in orders:
        if o.get('negocio_id') in b_map:
            b = b_map[o['negocio_id']]
            o['negocio_nombre'] = b['nombre']
            o['negocio_logo'] = b['logo_url']
            o['negocio_slug'] = b['slug']
            
    return orders

# Favorites Endpoints

@api_router.get("/client/favorites")
async def get_client_favorites(client: Cliente = Depends(get_current_client)):
    try:
        # Fetch favorites relation
        favs = supabase.table('clientes_favoritos').select('*').eq('cliente_id', client.id).execute()
        if not favs.data:
            return []
            
        negocio_ids = [f['negocio_id'] for f in favs.data]
        if not negocio_ids:
            return []
            
        # Fetch businesses
        businesses = supabase.table('negocios').select('id, nombre, slug, logo_url, categoria').in_('id', negocio_ids).execute()
        
        result = []
        for b in businesses.data:
            result.append({
                "negocio_id": b['id'],
                "usuario_telefono": client.telefono, # mapping to model
                "negocio_nombre": b['nombre'],
                "negocio_slug": b['slug'],
                "negocio_logo": b['logo_url'],
                "negocio_categoria": b.get('categoria', 'Restaurante')
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching favorites: {e}")
        return []

@api_router.get("/client/favorites/{slug}/check")
async def check_client_favorite(slug: str, client: Cliente = Depends(get_current_client)):
    try:
        biz_res = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if not biz_res.data:
            return {"is_favorite": False}
        
        biz_id = biz_res.data[0]['id']
        
        fav = supabase.table('clientes_favoritos').select('*').match({
            "cliente_id": client.id,
            "negocio_id": biz_id
        }).execute()
        
        return {"is_favorite": bool(fav.data)}
    except Exception as e:
        logger.error(f"Error checking favorite: {e}")
        return {"is_favorite": False}

@api_router.post("/client/favorites/{slug}")
async def toggle_client_favorite(slug: str, client: Cliente = Depends(get_current_client)):
    try:
        biz_res = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if not biz_res.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        
        biz_id = biz_res.data[0]['id']
        
        # Check if exists
        fav = supabase.table('clientes_favoritos').select('*').match({
            "cliente_id": client.id,
            "negocio_id": biz_id
        }).execute()
        
        if fav.data:
            # Delete
            supabase.table('clientes_favoritos').delete().match({
                "cliente_id": client.id,
                "negocio_id": biz_id
            }).execute()
            return {"is_favorite": False, "message": "Eliminado de favoritos"}
        else:
            # Add
            supabase.table('clientes_favoritos').insert({
                "cliente_id": client.id,
                "negocio_id": biz_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            return {"is_favorite": True, "message": "Agregado a favoritos"}
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error toggling favorite: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar favoritos")



class WebChatRequest(BaseModel):
    phone: str
    message: str

@api_router.post("/chat/web/{slug}")
async def web_chat_agent(slug: str, data: WebChatRequest):
    """
    Endpoint for the Web Modal Chat.
    Rules:
    - 1 Credit for starting a session (first message).
    - AI responses are free in the web modal.
    - If a sale is made, it deducts 2 more (handled in create_order).
    """
    try:
        # 1. Fetch Business
        biz_res = supabase.table('negocios').select('*').eq('slug', slug).execute()
        if not biz_res.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        
        business_data = biz_res.data[0]
        business_id = business_data['id']
        
        # 2. Check Credits/Limits (Web Modal is now a core feature and always active)
        wa_count = business_data.get('wa_messages_count', 0)
        wa_credits = business_data.get('wa_credits', 0)

        # 3. Manage Conversation and Billing
        # Phone for web chat is prefixed with 'web_' to keep it separate from real WA
        phone_id = f"web_{data.phone.strip()}"
        
        # Find or create active conversation
        conv_res = supabase.table('agent_conversations') \
            .select('*') \
            .eq('negocio_id', business_id) \
            .eq('phone_number', phone_id) \
            .eq('status', 'active') \
            .order('last_message_at', desc=True) \
            .limit(1) \
            .execute()
        
        conversation = conv_res.data[0] if conv_res.data else None
        
        # If no active conversation or it wasn't billed yet, we bill it now
        if not conversation or not conversation.get('is_billed', False):
            # Bill 1 credit for starting the IA session
            if wa_credits > 0:
                supabase.table('negocios').update({"wa_credits": wa_credits - 1}).eq("id", business_id).execute()
            else:
                update_data = {"wa_messages_count": wa_count + 1}
                if business_data.get('plan') == 'trial':
                    update_data["ai_credits_wa_used"] = business_data.get('ai_credits_wa_used', 0) + 1
                supabase.table('negocios').update(update_data).eq("id", business_id).execute()
            
            # If we are creating it now, bill it as part of creation logic later? 
            # Better to ensure the flag is set.
            if conversation:
                supabase.table('agent_conversations').update({"is_billed": True}).eq("id", conversation['id']).execute()
            else:
                # create_conversation will be called by process_whatsapp_message, but we want it billed.
                # So we create it explicitly here.
                new_conv = supabase.table('agent_conversations').insert({
                    "negocio_id": business_id,
                    "phone_number": phone_id,
                    "status": "active",
                    "is_billed": True
                }).execute()
        
        # 4. Process Message
        response_text = await process_whatsapp_message(data.message, phone_id, business_id)
        
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Error in web_chat_agent: {e}")
        logger.error(traceback.format_exc())
        return {"response": "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?"}
        
@api_router.post("/chat/audio/{slug}")
async def web_chat_audio_agent(slug: str, audio: UploadFile = File(...), phone: str = Form(...)):
    """
    Endpoint for the Web Modal Chat using Audio.
    Transcribes audio with Gemini and processes with process_whatsapp_message.
    """
    try:
        # 1. Fetch Business
        biz_res = supabase.table('negocios').select('*').eq('slug', slug).execute()
        if not biz_res.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        
        business_data = biz_res.data[0]
        business_id = business_data['id']
        
        # 2. Transcribe Audio with OpenAI Whisper
        audio_content = await audio.read()
        
        # Initialize OpenAI Client
        from openai import OpenAI
        openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Save temp file for whisper
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        
        try:
            with open(tmp_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            user_text = transcript.text.strip()
            logger.info(f"Whisper transcription for {slug}: {user_text}")
        except Exception as whisper_err:
            logger.error(f"Whisper Error: {whisper_err}")
            return {"response": "No pude procesar el audio correctamente. ¿Podrías intentar de nuevo o escribir tu mensaje?"}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not user_text:
             return {"response": "No pude escuchar nada en tu audio. ¿Podrías intentarlo de nuevo?"}

        # 3. Process with WhatsApp Agent logic (Full tools & History)
        phone_id = f"web_{phone.strip()}"
        
        # Billing check (handled inside web_chat_agent, but we replicate here or call it)
        # For simplicity, we call process_whatsapp_message directly which saves to history.
        # But we must ensure it's billed if it's the first message.
        conv_res = supabase.table('agent_conversations') \
            .select('*') \
            .eq('negocio_id', business_id) \
            .eq('phone_number', phone_id) \
            .eq('status', 'active') \
            .execute()
        
        conversation = conv_res.data[0] if conv_res.data else None
        if not conversation or not conversation.get('is_billed', False):
            wa_credits = business_data.get('wa_credits', 0)
            if wa_credits > 0:
                supabase.table('negocios').update({"wa_credits": wa_credits - 1}).eq("id", business_id).execute()
            else:
                wa_count = business_data.get('wa_messages_count', 0)
                update_data = {"wa_messages_count": wa_count + 1}
                if business_data.get('plan') == 'trial':
                    update_data["ai_credits_wa_used"] = business_data.get('ai_credits_wa_used', 0) + 1
                supabase.table('negocios').update(update_data).eq("id", business_id).execute()
            
            if conversation:
                supabase.table('agent_conversations').update({"is_billed": True}).eq("id", conversation['id']).execute()
            else:
                supabase.table('agent_conversations').insert({
                    "negocio_id": business_id,
                    "phone_number": phone_id,
                    "status": "active",
                    "is_billed": True
                }).execute()

        # Call the core processor (OpenAI with tools)
        from whatsapp_agent import process_whatsapp_message
        response_text = await process_whatsapp_message(user_text, phone_id, business_id)
        
        return {"response": response_text}

    except Exception as e:
        logger.error(f"Error in web_chat_audio_agent: {e}")
        logger.error(traceback.format_exc())
        return {"response": "Lo siento, tuve un problema procesando tu audio. ¿Podrías intentarlo de nuevo o escribir tu mensaje?"}

app.include_router(api_router)
