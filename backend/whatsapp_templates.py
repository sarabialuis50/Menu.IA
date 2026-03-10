import json
import logging

logger = logging.getLogger(__name__)

# --- CONFIGURACIÓN DE IDS DE TWILIO ---
# REEMPLAZA estos valores con los 'Content SID' que te asigne Twilio (ej: HXxxxxxxxx...)
TWILIO_SIDS = {
    "resumen_pedido": "HXf94d25186b54a3d484e794ec0de5fa27",      # Plantilla: resumen_vertical_v1
    "fidelidad": "HX23628ad40f0211a1379819bf608de21b",           # Plantilla: notificacion_fidelidad_v1
    "cumpleanos": "HX1f5542e7ab4c3a77f396a6a70fef1658",          # Plantilla: felicitacion_cumple_negocio
    "campana_marketing": "HX4e4cf9232106524f8a3f412c1baecc96",   # Plantilla: campana_masiva_custom
    "codigo_verificacion": "HX42003eb243fd020dbeaa9d9b983e7ea4",              # Plantilla: verificacion_otp
    "asignacion_repartidor": "HX1743ee41809bd9c543ab1e5393ea7645",             # Plantilla: asignacion_repartidor
    "seguimiento_cliente": "HX3659bc5dccb53e716316f42582cf45b4"               # Plantilla: seguimiento_cliente
}

def get_template_data(template_key, **kwargs):
    """
    Prepara el Content SID y las variables dinámicas para Twilio.
    """
    sid = TWILIO_SIDS.get(template_key)
    if not sid or sid == "PENDIENTE":
        return None, None
    
    # Función auxiliar para limpiar y truncar valores (evita fallos de Twilio por longitud o caracteres)
    def sanitize_val(val, truncate_len=None):
        if val is None: return ""
        if not isinstance(val, str): val = str(val)
        # Preserve newlines for formatting
        cleaned = val.strip()
        return cleaned[:truncate_len] if truncate_len else cleaned

    variables = {}

    if template_key == "asignacion_repartidor":
        # {{1}} Repartidor, {{2}} Negocio, {{3}} Cliente, {{4}} Tel Cliente, {{5}} Dirección, {{6}} PedidoID, {{7}} Link Mapa
        variables = {
            "1": sanitize_val(kwargs.get("repartidor_nombre", "Repartidor"), 40),
            "2": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 50),
            "3": sanitize_val(kwargs.get("cliente_nombre", "Cliente"), 50),
            "4": sanitize_val(kwargs.get("cliente_telefono", "N/A"), 25),
            "5": sanitize_val(kwargs.get("direccion_entrega", "Ver en mapa"), 200),
            "6": sanitize_val(kwargs.get("order_id_corto", "N/A"), 20),
            "7": sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 100)
        }
    
    elif template_key == "seguimiento_cliente":
        # {{1}} Cliente, {{2}} Negocio, {{3}} Repartidor, {{4}} Tel Repartidor, {{5}} Dirección, {{6}} PedidoID, {{7}} Link Mapa
        variables = {
            "1": sanitize_val(kwargs.get("cliente_nombre", "Cliente"), 50),
            "2": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 50),
            "3": sanitize_val(kwargs.get("repartidor_nombre", "Repartidor"), 40),
            "4": sanitize_val(kwargs.get("repartidor_telefono", "N/A"), 25),
            "5": sanitize_val(kwargs.get("direccion_entrega", "Ver en mapa"), 200),
            "6": sanitize_val(kwargs.get("order_id_corto", "N/A"), 20),
            "7": sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 100)
        }

    elif template_key == "resumen_pedido":
        # Template labels in Twilio (FIXED mapping):
        #   {{1}} → 🔔 Nuevo Pedido - [Negocio]
        #   {{2}} → 🆔 ID del Pedido: [ID]
        #   {{3}} → 👤 DATOS DEL CLIENTE [Info]
        #   {{4}} → 🛒 DETALLE DEL PEDIDO [Detalle]
        #   {{5}} → 🛵 ENTREGA [Entrega Info]
        #   {{6}} → 💳 RESUMEN DE PAGO [Totales]
        #   {{7}} → 🏧 Método de Pago: [Pago]
        #   {{8}} → 🚚 Método de Entrega: [Entrega]
        #   {{9}} → 🌐 Realizado: [Fecha]
        #   {{10}} → 🔗 Ver mi pedido: [Link]
        variables = {
            "1": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 50),
            "2": sanitize_val(kwargs.get("pedido_id", "N/A"), 50),
            "3": sanitize_val(kwargs.get('cliente_info', f"Nombre: {kwargs.get('cliente_nombre', 'Cliente')}\nTel: {kwargs.get('cliente_telefono', 'N/A')}"), 400),
            "4": sanitize_val(kwargs.get("detalle_carrito", "Detalle no disponible"), 900),
            "5": sanitize_val(kwargs.get("entrega_info", "Recoge en local"), 400),
            "6": sanitize_val(kwargs.get("resumen_pago", "TOTAL: $0"), 400),
            "7": sanitize_val(kwargs.get("metodo_pago", "Efectivo"), 30),
            "8": sanitize_val(kwargs.get("metodo_entrega", "Domicilio"), 200),
            "9": sanitize_val(kwargs.get("fecha", ""), 50),
            "10": sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 100)
        }

    elif template_key == "fidelidad":
        # variables: {{1}} Cliente, {{2}} Acción, {{3}} Negocio, {{4}} Puntos
        variables = {
            "1": kwargs.get("cliente_nombre", "Cliente"),
            "2": kwargs.get("accion", "Has ganado puntos"),
            "3": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "4": str(kwargs.get("puntos", 0))
        }

    elif template_key == "cumpleanos":
        # variables: {{1}} Cliente, {{2}} Negocio
        variables = {
            "1": kwargs.get("cliente_nombre", "Cumpleañero"),
            "2": kwargs.get("negocio_nombre", "Nuestro Negocio")
        }

    elif template_key == "campana_marketing":
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} Mensaje, {{4}} Link
        variables = {
            "1": kwargs.get("cliente_nombre", "Cliente"),
            "2": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "3": kwargs.get("mensaje_personalizado", ""),
            "4": kwargs.get("link", "https://menuia.co")
        }

    elif template_key == "codigo_verificacion":
        # variables: {{1}} OTP Code, {{2}} Negocio
        variables = {
            "1": kwargs.get("otp_code", ""),
            "2": kwargs.get("negocio_nombre", "Menu.IA")
        }


    return sid, variables
