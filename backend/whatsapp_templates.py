import json
import logging

logger = logging.getLogger(__name__)

# --- CONFIGURACIÓN DE IDS DE TWILIO ---
# REEMPLAZA estos valores con los 'Content SID' que te asigne Twilio (ej: HXxxxxxxxx...)
TWILIO_SIDS = {
    "resumen_pedido": "HXf94d25186b54a3d484e794ec0de5fa27",      # Plantilla: resumen_vertical_v1 (Creada por el usuario)
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
        # Variable names in Content SID HX1743ee41809bd9c543ab1e5393ea7645
        # variables: {{1}} Repartidor, {{2}} Negocio, {{3}} Cliente, {{4}} Telefono Cliente, {{5}} Dirección, {{6}} ID Pedido, {{7}} Link
        variables = {
            "1": sanitize_val(kwargs.get("repartidor_nombre", "Repartidor"), 60),
            "2": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 60),
            "3": sanitize_val(kwargs.get("cliente_nombre", "Cliente"), 60),
            "4": sanitize_val(kwargs.get("cliente_telefono", "N/A"), 30),
            "5": sanitize_val(kwargs.get("direccion_entrega", "Ver en mapa"), 300),
            "6": sanitize_val(kwargs.get("order_id_corto", "N/A"), 30),
            "7": sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 150)
        }
    
    elif template_key == "seguimiento_cliente":
        # Variable names in Content SID HX3659bc5dccb53e716316f42582cf45b4
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} Repartidor, {{4}} Telefono Repartidor, {{5}} Dirección, {{6}} ID Pedido, {{7}} Link
        variables = {
            "1": sanitize_val(kwargs.get("cliente_nombre", "Cliente"), 60),
            "2": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 60),
            "3": sanitize_val(kwargs.get("repartidor_nombre", "Repartidor"), 60),
            "4": sanitize_val(kwargs.get("repartidor_telefono", "N/A"), 30),
            "5": sanitize_val(kwargs.get("direccion_entrega", "Ver en mapa"), 300),
            "6": sanitize_val(kwargs.get("order_id_corto", "N/A"), 30),
            "7": sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 150)
        }

    elif template_key == "resumen_pedido":
        # Supports both numbered mapping for vertical_v1 and potential named mapping
        negocio = sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 80)
        pedido_id = sanitize_val(kwargs.get("pedido_id", "N/A"), 40)
        cliente = sanitize_val(kwargs.get('cliente_info', ""), 800)
        detalle = sanitize_val(kwargs.get("detalle_carrito", "Varios"), 2500)
        entrega = sanitize_val(kwargs.get("entrega_info", ""), 1000)
        resumen = sanitize_val(kwargs.get("resumen_pago", ""), 800)
        metodo_p = sanitize_val(kwargs.get("metodo_pago", "Efectivo"), 60)
        metodo_e = sanitize_val(kwargs.get("metodo_entrega", "Domicilio"), 80)
        fecha_str = sanitize_val(kwargs.get("fecha", ""), 100)
        link = sanitize_val(kwargs.get("link_seguimiento", "https://menuia.co"), 250)

        variables = {
            "1": negocio, "negocio_nombre": negocio,
            "2": pedido_id, "pedido_id": pedido_id,
            "3": cliente, "cliente_info": cliente,
            "4": detalle, "detalle_carrito": detalle,
            "5": entrega, "entrega_info": entrega,
            "6": resumen, "resumen_pago": resumen,
            "7": metodo_p, "metodo_pago": metodo_p,
            "8": metodo_e, "metodo_entrega": metodo_e,
            "9": fecha_str, "fecha": fecha_str,
            "10": link, "link_seguimiento": link
        }

    elif template_key == "fidelidad":
        # variables: {{1}} Cliente, {{2}} Acción, {{3}} Negocio, {{4}} Puntos
        # Variable names in Content SID HX23628ad40f0211a1379819bf608de21b
        variables = {
            "cliente_nombre": kwargs.get("cliente_nombre", "Cliente"),
            "accion": kwargs.get("accion", "Has ganado puntos"),
            "negocio_nombre": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "puntos": str(kwargs.get("puntos", 0))
        }

    elif template_key == "cumpleanos":
        # variables: {{1}} Cliente, {{2}} Negocio
        # Variable names in Content SID HX1f5542e7ab4c3a77f396a6a70fef1658
        variables = {
            "cliente_nombre": kwargs.get("cliente_nombre", "Cumpleañero"),
            "negocio_nombre": kwargs.get("negocio_nombre", "Nuestro Negocio")
        }

    elif template_key == "campana_marketing":
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} Mensaje, {{4}} Link
        # Variable names in Content SID HX4e4cf9232106524f8a3f412c1baecc96
        variables = {
            "cliente_nombre": kwargs.get("cliente_nombre", "Cliente"),
            "negocio_nombre": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "mensaje_personalizado": kwargs.get("mensaje_personalizado", ""),
            "link": kwargs.get("link", "https://menuia.co")
        }

    elif template_key == "codigo_verificacion":
        # variables: {{1}} OTP Code, {{2}} Negocio
        # Variable names in Content SID HX42003eb243fd020dbeaa9d9b983e7ea4
        # variables: {{1}} OTP Code, {{2}} Negocio
        variables = {
            "1": kwargs.get("otp_code", ""),
            "2": kwargs.get("negocio_nombre", "Menu.IA")
        }


    return sid, variables
