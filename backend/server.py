from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect, File, UploadFile
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
import asyncio
import uuid
from pathlib import Path

# Load environment variables FIRST
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import google.generativeai as genai
from fastapi import Request
from openai import OpenAI
from ai_base import get_shared_instructions, get_fallback_message
import traceback

# Import WhatsApp Agent Functions (now env vars are loaded)
from whatsapp_agent import process_whatsapp_message, send_whatsapp_response

from models import Business, BusinessCreate, BusinessLogin, BusinessPublic, BusinessAnalytics, DailyStats
from models import Product, ProductCreate, ProductUpdate
from models import Table, TableCreate, TableUpdate, TableStatus
from models import Employee, EmployeeCreate, EmployeeLogin, EmployeeRole
from models import Order, OrderCreate, OrderUpdate, OrderStatus, OrderItem
from models import TokenResponse, EmployeeTokenResponse, WhatsAppConfig
from models import LoyaltyConfig, LoyaltyConfigCreate, LoyaltyConfigUpdate
from models import CustomerPoints, CustomerPointsPublic, CustomerCreate, PointsTransaction
from models import RedeemPointsRequest, RedeemPointsResponse, AwardPointsRequest
from models_client import Cliente, ClienteCreate, ClienteUpdate
from models_client import Address, AddressCreate, AddressUpdate
from models_client import OTPRequest, OTPVerify, ClientTokenResponse

# Supabase connection
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET', 'menu.ia-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Menu.IA API", version="1.0.0")

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Menu.IA API is running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://menuia.co",
        "https://www.menuia.co",
        "https://menuia-production.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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



# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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
        items_text += f"   Cantidad: {item.cantidad}\n"
        items_text += f"   Precio: ${item.precio_unitario:,.2f}\n"
        items_text += f"   Subtotal: ${item_subtotal:,.2f}\n\n"
    
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
    return {"message": "MenuPro API v1.0", "status": "running"}


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
            email=data.email
        )
        
        # Store with password hash
        business_dict = serialize_doc(business.model_dump())
        business_dict['password_hash'] = hash_password(data.password)
        
        # Remove fields not in DB schema to prevent errors
        cols_res = supabase.table('negocios').select('*').limit(0).execute()
        db_cols = []
        # Fallback if we can't get columns easily - but we know the core ones
        core_cols = ['id', 'nombre', 'slug', 'slogan', 'descripcion', 'direccion', 'telefono', 'whatsapp', 'horarios', 'logo_url', 'banner_url', 'email', 'password_hash']
        
        filtered_dict = {k: v for k, v in business_dict.items() if v is not None}
        # Explicitly remove known problematic fields if they leak
        for field in ['is_active', 'plan', 'subscription_plan']:
            if field in filtered_dict:
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
    response = supabase.table('negocios').select('*').eq('email', data.email).execute()
    if not response.data:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    business_doc = response.data[0]
    if not verify_password(data.password, business_doc.get('password_hash', '')):
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


# ============ BUSINESS ROUTES ============
@api_router.get("/business/{slug}", response_model=BusinessPublic)
async def get_business_by_slug(slug: str):
    response = supabase.table('negocios').select('*').match({"slug": slug}).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    business_doc = response.data[0]
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
        'ai_habilitado', 'ai_personalidad', 'ai_saludo', 'ai_conocimiento'
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
    
    try:
        data_dict = serialize_doc(product.model_dump())
        res = supabase.table('productos').insert(data_dict).execute()
        return product
    except Exception as e:
        error_str = str(e)
        logger.warning(f"Error creating product, attempting to handle missing columns: {error_str}")
        
        # Handle missing columns gracefully
        new_columns = ['destacado', 'oferta_porcentaje', 'precio_original', 'etiqueta']
        
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
    
    try:
        response = supabase.table('productos').update(update_data).match({
            "id": product_id, 
            "negocio_id": business.id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        return Product(**response.data[0])
    except Exception as e:
        error_str = str(e)
        logger.warning(f"Error updating product, checking for missing columns: {error_str}")
        new_columns = ['destacado', 'oferta_porcentaje', 'precio_original', 'etiqueta']

        if "column" in error_str.lower():
            for col in new_columns:
                if col in error_str.lower():
                    logger.warning(f"Removing missing column '{col}' from update payload.")
                    update_data.pop(col, None)
            
            try:
                response = supabase.table('productos').update(update_data).match({
                    "id": product_id, 
                    "negocio_id": business.id
                }).execute()
                if not response.data:
                    raise HTTPException(status_code=404, detail="Producto no encontrado")
                return Product(**response.data[0])
            except Exception as e2:
                # Retry one more time if yet another column is missing
                error_str2 = str(e2)
                if "column" in error_str2.lower():
                    for col in new_columns:
                        if col in error_str2.lower():
                            logger.warning(f"Removing another missing column '{col}' from update payload.")
                            update_data.pop(col, None)
                    try:
                        response = supabase.table('productos').update(update_data).match({
                            "id": product_id, 
                            "negocio_id": business.id
                        }).execute()
                        if not response.data:
                            raise HTTPException(status_code=404, detail="Producto no encontrado")
                        return Product(**response.data[0])
                    except Exception as e3:
                        raise HTTPException(status_code=500, detail=f"Error al actualizar producto (múltiples columnas faltantes): {str(e3)}")
                raise HTTPException(status_code=500, detail=f"Error al actualizar producto (reintento): {str(e2)}")

        logger.error(f"Error updating product: {error_str}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al actualizar producto: {error_str}")


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


# ============ CATEGORIES ROUTES ============
@api_router.get("/categories/{slug}")
async def get_categories(slug: str):
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
        
        response = supabase.table('negocios').select('id', 'nombre').eq('slug', slug).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        business_id = response.data[0]['id']
        business_name = response.data[0]['nombre']
        
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

        # Send WhatsApp summary to customer in background
        if order.cliente_telefono:
            background_tasks.add_task(send_order_wa_background, business_name, order)
        
        return order
    except Exception as e:
        logger.error(f"ERROR in create_order: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error creando pedido: {str(e)}")

def send_order_wa_background(business_name: str, order: Order):
    try:
        wa_message = format_order_summary_wa(business_name, order)
        send_whatsapp_response(order.cliente_telefono, wa_message)
        logger.info(f"WhatsApp summary sent to {order.cliente_telefono}")
    except Exception as wa_err:
        logger.error(f"Error sending WhatsApp summary: {wa_err}")
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
            send_whatsapp_response(rep.get('telefono') or biz['telefono'], msg) 
            
        elif type == 'enviado':
            # Notify Customer
            link = f"{frontend_url}/{slug}/mis-pedidos"
            msg = f"🔔 *¡Tu pedido va en camino!* (#ID: {order_id[:8].upper()})\n\nNuestro repartidor ya salió del local. Puedes seguir el rastro en tiempo real aquí: {link}\n\n¡Prepárate!"
            send_whatsapp_response(order['cliente_telefono'], msg)
            
        elif type == 'entregado':
            # Notify Customer
            msg_cust = f"✅ *¡Pedido Entregado!* (#ID: {order_id[:8].upper()})\n\nEsperamos que disfrutes tu comida. ¡Gracias por elegir {biz['nombre']}!"
            send_whatsapp_response(order['cliente_telefono'], msg_cust)
            
            # Notify Admin/Business
            msg_admin = f"💰 *ENTREGA COMPLETADA*\n\nEl pedido #{order_id[:8].upper()} ha sido entregado exitosamente al cliente {order['cliente_nombre']}."
            send_whatsapp_response(biz['telefono'], msg_admin)

    except Exception as e:
        logger.error(f"Error in delivery notification background: {str(e)}")


@api_router.put("/orders/{slug}/{order_id}", response_model=Order)
async def update_order(slug: str, order_id: str, data: OrderUpdate):
    try:
        response = supabase.table('negocios').select('id').eq('slug', slug).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Negocio no encontrado")
        business_id = response.data[0]['id']
        
        update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table('pedidos').update(update_data).match({
            "id": order_id, 
            "negocio_id": business_id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
        order_doc = response.data[0]
        order = Order(**order_doc)
        
        # If order is delivered or cancelled, free the table
        if data.estado in [OrderStatus.ENTREGADO, OrderStatus.CANCELADO] and order.mesa_id:
            supabase.table('mesas').update({"estado": "libre"}).eq("id", order.mesa_id).execute()
        
        # Award loyalty points when order is delivered
        points_info = None
        if data.estado == OrderStatus.ENTREGADO and order.cliente_telefono:
            points_info = await award_loyalty_points(
                negocio_id=business_id,
                telefono=order.cliente_telefono,
                nombre=order.cliente_nombre,
                total=order.total,
                pedido_id=order.id
            )
        
        # Broadcast order update
        broadcast_data = serialize_doc(order.model_dump())
        if points_info:
            broadcast_data['puntos_ganados'] = points_info
        
        await manager.broadcast(business_id, {
            "type": "order_updated",
            "data": broadcast_data
        })
        
        # Trigger background notifications
        from fastapi import BackgroundTasks
        # We need access to background_tasks here, but we are inside an async def.
        # FastAPI handles this if we add it to the params.
        # Wait, I can't easily change the signature of standard update_order if I don't see it all.
        # But I can just use asyncio.create_task for a simple background execution if I don't want to change signature.
        
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
    
    response = supabase.table('pedidos').select('*').match({
        "negocio_id": business_id,
        "cliente_telefono": telefono
    }).order('created_at', desc=True).limit(20).execute()
    
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
        # Return default config if none exists
        return LoyaltyConfig(
            negocio_id=business_id,
            activo=False,
            pesos_por_punto=1000,
            puntos_minimo_canje=100,
            valor_punto_descuento=100
        )
    
    return LoyaltyConfig(**response.data[0])


@api_router.post("/loyalty/{slug}/config", response_model=LoyaltyConfig)
async def create_or_update_loyalty_config(slug: str, data: LoyaltyConfigCreate, business: Business = Depends(get_current_business)):
    """Create or update loyalty program configuration"""
    if business.slug != slug:
        raise HTTPException(status_code=403, detail="No autorizado")
    
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
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
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
    business_doc = await db.businesses.find_one({"slug": slug}, {"_id": 0})
    if not business_doc:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    # Get loyalty config
    config = await db.loyalty_configs.find_one({"negocio_id": business_doc['id']}, {"_id": 0})
    if not config or not config.get('activo', False):
        raise HTTPException(status_code=400, detail="El programa de fidelidad no está activo")
    
    # Get customer points
    customer = await db.customer_points.find_one({
        "negocio_id": business_doc['id'],
        "telefono": data.telefono
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    if customer['puntos_disponibles'] < data.puntos_a_canjear:
        return RedeemPointsResponse(
            exito=False,
            mensaje=f"No tienes suficientes puntos. Disponibles: {customer['puntos_disponibles']}",
            descuento_aplicado=0,
            puntos_restantes=customer['puntos_disponibles']
        )
    
    if data.puntos_a_canjear < config.get('puntos_minimo_canje', 100):
        return RedeemPointsResponse(
            exito=False,
            mensaje=f"Mínimo {config['puntos_minimo_canje']} puntos para canjear",
            descuento_aplicado=0,
            puntos_restantes=customer['puntos_disponibles']
        )
    
    # Calculate discount
    valor_punto = config.get('valor_punto_descuento', 100)
    descuento = data.puntos_a_canjear * valor_punto
    
    # Update customer points
    new_disponibles = customer['puntos_disponibles'] - data.puntos_a_canjear
    new_canjeados = customer['puntos_canjeados'] + data.puntos_a_canjear
    
    await db.customer_points.update_one(
        {"negocio_id": business_doc['id'], "telefono": data.telefono},
        {"$set": {
            "puntos_disponibles": new_disponibles,
            "puntos_canjeados": new_canjeados,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create transaction record
    transaction = PointsTransaction(
        negocio_id=business_doc['id'],
        telefono=data.telefono,
        tipo="canjeado",
        puntos=-data.puntos_a_canjear,
        descripcion=f"Canje de {data.puntos_a_canjear} puntos por descuento de ${descuento:,.0f}"
    )
    await db.points_transactions.insert_one(serialize_doc(transaction.model_dump()))
    
    return RedeemPointsResponse(
        exito=True,
        mensaje=f"¡Canjeaste {data.puntos_a_canjear} puntos! Descuento: ${descuento:,.0f} COP",
        descuento_aplicado=descuento,
        puntos_restantes=new_disponibles
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
    if not response.data or not response.data[0].get('activo', False):
        return None
    config = response.data[0]
    
    # Calculate points
    pesos_por_punto = float(config.get('pesos_por_punto', 1000))
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
        sender_phone = form_data.get('From', '').replace('whatsapp:', '')
        message_body = form_data.get('Body', '')
        
        logger.info(f"WhatsApp webhook received from {sender_phone}: {message_body}")
        
        if not sender_phone or not message_body:
            return {"status": "ignored", "reason": "missing_data"}

        # TODO: Lookup business by 'To' number or assume default for single-tenant dev
        # For now, we fetch the most recent business created to use as context
        try:
             # Fetch the latest business created to serve as the default strict context
             response = supabase.table('negocios') \
                 .select('id') \
                 .order('created_at', desc=True) \
                 .limit(1) \
                 .execute()
             
             if not response.data:
                 logger.error("No business found in database to link agent")
                 return {"status": "error", "reason": "no_business_found"}
             
             negocio_id = response.data[0]['id']
             
             # Process with AI Agent
             response_text = await process_whatsapp_message(message_body, sender_phone, negocio_id)
             
             # Send response back via Twilio
             if response_text:
                 send_whatsapp_response(sender_phone, response_text)
                 
             return {"status": "processed", "response": response_text}

        except Exception as e:
            logger.error(f"Error fetching business or processing AI: {e}")
            return {"status": "error", "detail": str(e)}

    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return {"status": "error", "detail": str(e)}


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
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_text)

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



# --- GEMINI CHAT ENDPOINT ---

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []

@api_router.post("/gemini/chat/{negocio_id}")
async def chat_with_consultant(negocio_id: str, request: ChatRequest, business: Business = Depends(get_current_business)):
    if business.id != negocio_id:
        raise HTTPException(status_code=403, detail="No autorizado")

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
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_instructions)
            chat = model.start_chat(history=chat_history)
            response = chat.send_message(request.message)
            return {"reply": response.text, "provider": "gemini"}
            
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
        send_whatsapp_response(phone, msg)
        
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


app.include_router(api_router)
