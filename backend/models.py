from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


def generate_id():
    return str(uuid.uuid4())


def get_utc_now():
    return datetime.now(timezone.utc)


class OrderStatus(str, Enum):
    PENDIENTE = "pendiente"
    ACEPTADO = "aceptado"
    PREPARANDO = "preparando"
    LISTO = "listo"
    ENVIADO = "enviado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class TableStatus(str, Enum):
    LIBRE = "libre"
    OCUPADA = "ocupada"
    PENDIENTE = "pendiente"


class EmployeeRole(str, Enum):
    DUENO = "dueno"
    MESERO = "mesero"
    COCINA = "cocina"
    REPARTIDOR = "repartidor"


# Business Models
class BusinessBase(BaseModel):
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    slogan: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    horarios: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    banner_tag: Optional[str] = "Los mejores sabores"
    banner_title: Optional[str] = "Nuestro Menú"
    banner_description: Optional[str] = None
    # Delivery Config
    precio_km: Optional[float] = 0.0
    costo_minimo_domicilio: Optional[float] = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    # Operation Config
    metodos_pago: Optional[Dict[str, Any]] = {
        "efectivo": True,
        "nequi": True,
        "daviplata": False,
        "transferencia": True,
        "tarjeta": False,
        "link": False
    }
    metodos_entrega: Optional[Dict[str, Any]] = {
        "domicilio": True,
        "recoger": True,
        "mesa": True
    }
    # AI Config
    ai_habilitado: Optional[bool] = True
    ai_personalidad: Optional[str] = "Amigable y cercano (Recomendado)"
    ai_saludo: Optional[str] = None
    ai_conocimiento: Optional[str] = None
    google_maps_review_url: Optional[str] = None
    # Custom Twilio Config (For Pro businesses)
    twilio_sid: Optional[str] = None
    twilio_token: Optional[str] = None
    twilio_number: Optional[str] = None
    ai_use_modal: Optional[bool] = True

    @field_validator('metodos_entrega', mode='before')
    @classmethod
    def normalize_metodos_entrega(cls, v: Any) -> Any:
        if isinstance(v, list):
            lower = [str(m).lower() for m in v]
            return {
                "domicilio": any('domicilio' in m for m in lower),
                "recoger": any('recoger' in m or 'llevar' in m for m in lower),
                "mesa": any('mesa' in m for m in lower)
            }
        if isinstance(v, dict):
            return {
                "domicilio": v.get("domicilio", False),
                "recoger": v.get("recoger", False),
                "mesa": v.get("mesa", False)
            }
        if v is None:
            return {"domicilio": True, "recoger": True, "mesa": True}
        return v

    @field_validator('metodos_pago', mode='before')
    @classmethod
    def normalize_metodos_pago(cls, v: Any) -> Any:
        if isinstance(v, list):
            lower = [str(m).lower() for m in v]
            return {
                "efectivo": any('efectivo' in m for m in lower),
                "nequi": any('nequi' in m for m in lower),
                "daviplata": any('daviplata' in m for m in lower),
                "transferencia": any('transferencia' in m for m in lower),
                "tarjeta": any('tarjeta' in m or 'datáfono' in m or 'datafono' in m for m in lower),
                "link": any('link' in m or 'epayco' in m or 'wompi' in m for m in lower)
            }
        if isinstance(v, dict):
            return {
                "efectivo": v.get("efectivo", False),
                "nequi": v.get("nequi", False),
                "daviplata": v.get("daviplata", False),
                "transferencia": v.get("transferencia", False),
                "tarjeta": v.get("tarjeta", False),
                "link": v.get("link", False)
            }
        if v is None:
            return {"efectivo": True, "nequi": True, "transferencia": True, "daviplata": False, "tarjeta": False, "link": False}
        return v

class BusinessCreate(BusinessBase):
    email: str
    password: str

class BusinessLogin(BaseModel):
    email: str
    password: str

class Business(BusinessBase):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(default_factory=generate_id)
    email: str
    created_at: datetime = Field(default_factory=get_utc_now)
    plan: Optional[str] = "free"
    is_active: bool = True 
    wa_messages_count: int = 0
    wa_messages_limit: int = 0
    wa_credits: int = 0
    plan_expires_at: Optional[datetime] = None

class BusinessPublic(BusinessBase):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str
    plan: Optional[str] = "free"
    wa_messages_count: int = 0
    wa_messages_limit: int = 0
    wa_credits: int = 0
    plan_expires_at: Optional[datetime] = None


# Product Models
class ProductBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    precio_original: Optional[float] = None
    oferta_porcentaje: Optional[int] = None
    categoria: str
    imagen: Optional[str] = None
    etiqueta: Optional[str] = None
    disponible: bool = True
    destacado: bool = False
    orden: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    precio_original: Optional[float] = None
    oferta_porcentaje: Optional[int] = None
    categoria: Optional[str] = None
    imagen: Optional[str] = None
    etiqueta: Optional[str] = None
    disponible: Optional[bool] = None
    destacado: Optional[bool] = None
    orden: Optional[int] = None


class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    created_at: datetime = Field(default_factory=get_utc_now)


# Table Models
class TableBase(BaseModel):
    numero: int
    capacidad: int = 4
    ubicacion: Optional[str] = None
    empleado_id: Optional[str] = None


class TableCreate(TableBase):
    pass


class TableUpdate(BaseModel):
    numero: Optional[int] = None
    capacidad: Optional[int] = None
    ubicacion: Optional[str] = None
    empleado_id: Optional[str] = None
    estado: Optional[TableStatus] = None


class Table(TableBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    estado: TableStatus = TableStatus.LIBRE
    qr_code: Optional[str] = None
    empleado_id: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)


# Employee Models
class EmployeeBase(BaseModel):
    nombre: str
    pin: str
    rol: EmployeeRole = EmployeeRole.MESERO
    telefono: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeLogin(BaseModel):
    pin: str


class Employee(EmployeeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    activo: bool = True
    created_at: datetime = Field(default_factory=get_utc_now)


# Order Item Models
class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    producto_id: Optional[str] = None
    nombre: str
    cantidad: int
    precio_unitario: float = Field(..., alias="precio")  # Handle both names
    notas: Optional[str] = None
    modificadores: Optional[List[str]] = None

    def __init__(self, **data):
        # Fallback for precio_unitario if given directly
        if "precio_unitario" in data and "precio" not in data:
            data["precio"] = data["precio_unitario"]
        super().__init__(**data)


# Order Models
class OrderBase(BaseModel):
    mesa_id: Optional[str] = None
    mesa_numero: Optional[int] = None
    items: List[OrderItem]
    notas: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    tipo: str = "mesa"  # mesa, takeaway, delivery
    metodo_pago: Optional[str] = "Efectivo"
    metodo_entrega: Optional[str] = None
    direccion: Optional[str] = None
    distancia: Optional[float] = None
    costo_envio: Optional[float] = 0.0
    cliente_lat: Optional[float] = None
    cliente_lng: Optional[float] = None


class OrderCreate(OrderBase):
    via_ai: Optional[bool] = False


class OrderUpdate(BaseModel):
    estado: Optional[OrderStatus] = None
    notas: Optional[str] = None
    repartidor_id: Optional[str] = None
    repartidor_lat: Optional[float] = None
    repartidor_lng: Optional[float] = None



class ClientFavorite(BaseModel):
    id: Optional[str] = None
    usuario_telefono: str # Use phone or client_id? client_id is cleaner. but existing endpoints heavily use phone. 
    negocio_id: str
    created_at: Optional[datetime] = None
    
    # Optional fields for frontend display
    negocio_nombre: Optional[str] = None
    negocio_slug: Optional[str] = None
    negocio_logo: Optional[str] = None
    negocio_categoria: Optional[str] = None


class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    mesero_id: Optional[str] = None
    repartidor_id: Optional[str] = None
    repartidor_lat: Optional[float] = None
    repartidor_lng: Optional[float] = None
    business_lat: Optional[float] = None
    business_lng: Optional[float] = None
    estado: OrderStatus = OrderStatus.PENDIENTE
    total: float = 0.0
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)
    
    # Extra fields for list view
    negocio_nombre: Optional[str] = None
    negocio_logo: Optional[str] = None
    mesero_nombre: Optional[str] = None


# Analytics Models
class DailyStats(BaseModel):
    fecha: str
    total_pedidos: int
    total_ventas: float
    pedidos_completados: int
    pedidos_cancelados: int


class BusinessAnalytics(BaseModel):
    ventas_hoy: float
    pedidos_hoy: int
    pedidos_activos: int
    mesas_ocupadas: int
    mesas_totales: int
    productos_agotados: int
    ultimos_7_dias: List[DailyStats]


# WhatsApp Config
class WhatsAppConfig(BaseModel):
    negocio_id: str
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    mensaje_bienvenida: str = "¡Hola! Bienvenido a {negocio}. Escribe 'menu' para ver nuestro menú."
    is_configured: bool = False


# Auth Response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business: BusinessPublic


class EmployeeTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: Employee



# Loyalty Program Models
class LoyaltyConfigBase(BaseModel):
    activo: bool = True
    pesos_por_punto: int = 1000  # Cuantos pesos equivalen a 1 punto
    puntos_minimo_canje: int = 100  # Minimo de puntos para canjear
    valor_punto_descuento: int = 100  # Cuantos pesos vale 1 punto al canjear


class LoyaltyConfigCreate(LoyaltyConfigBase):
    pass


class LoyaltyConfigUpdate(BaseModel):
    activo: Optional[bool] = None
    pesos_por_punto: Optional[int] = None
    puntos_minimo_canje: Optional[int] = None
    valor_punto_descuento: Optional[int] = None


class LoyaltyConfig(LoyaltyConfigBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    created_at: datetime = Field(default_factory=get_utc_now)


# Customer Loyalty Points
class CustomerPoints(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    telefono: str  # Identificador del cliente
    nombre: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    puntos_totales: int = 0
    puntos_actuales: int = 0
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class CustomerCreate(BaseModel):
    nombre: str
    telefono: str
    email: Optional[str] = None
    fecha_nacimiento: Optional[str] = None


class CustomerPointsPublic(BaseModel):
    telefono: str
    nombre: Optional[str] = None
    email: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    puntos_actuales: int
    puntos_disponibles: int
    puntos_totales: int
    puntos_canjeados: int = 0
    total_compras: float = 0.0
    cantidad_pedidos: int = 0
    visit_context: Optional[str] = None
    created_at: Optional[datetime] = None


# Points Transaction History
class PointsTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    negocio_id: str
    telefono: str
    tipo: str  # "ganado", "canjeado"
    puntos: int
    pedido_id: Optional[str] = None
    descripcion: str
    created_at: datetime = Field(default_factory=get_utc_now)


class RedeemPointsRequest(BaseModel):
    telefono: str
    puntos_a_canjear: int


class AwardPointsRequest(BaseModel):
    telefono: str
    puntos: int
    descripcion: Optional[str] = None
    monto: Optional[float] = None


class RedeemPointsResponse(BaseModel):
    exito: bool
    mensaje: str
    descuento_aplicado: float
    puntos_restantes: int
