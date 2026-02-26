from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from models import generate_id, get_utc_now

# Client Models
class ClienteBase(BaseModel):
    telefono: str
    nombre: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    fecha_nacimiento: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    fecha_nacimiento: Optional[str] = None

class Cliente(ClienteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: Optional[datetime] = None

# Address Models
class AddressBase(BaseModel):
    nombre: str
    direccion: str
    ciudad: Optional[str] = None
    es_principal: bool = False
    referencia: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    es_principal: Optional[bool] = None
    referencia: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class Address(AddressBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    cliente_id: str
    created_at: datetime = Field(default_factory=get_utc_now)

# Auth Request Models
class OTPRequest(BaseModel):
    telefono: str

class OTPVerify(BaseModel):
    telefono: str
    otp: str

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None # Optional if they logged in via OTP
    new_password: str

class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    cliente: Cliente
