import json
import logging

logger = logging.getLogger(__name__)

# --- CONFIGURACIÓN DE IDS DE TWILIO ---
# REEMPLAZA estos valores con los 'Content SID' que te asigne Twilio (ej: HXxxxxxxxx...)
TWILIO_SIDS = {
    "resumen_pedido": "HX0a347542fcdee021da48601dab0775df",      # Plantilla: resumen_pedido
    "fidelidad": "HX23628ad40f0211a1379819bf608de21b",           # Plantilla: notificacion_fidelidad_v1
    "cumpleanos": "HX1f5542e7ab4c3a77f396a6a70fef1658",          # Plantilla: felicitacion_cumple_negocio
    "campana_marketing": "HX4e4cf9232106524f8a3f412c1baecc96",   # Plantilla: campana_masiva_custom
    "pedido_en_camino": "HX89eb01626bffa51988179da38eef6f79",    # Plantilla: pedido_en_camino
    "codigo_verificacion": "HX42003eb243fd020dbeaa9d9b983e7ea4"                # Plantilla: verificacion_otp
}

def get_template_data(template_key, **kwargs):
    """
    Prepara el Content SID y las variables dinámicas para Twilio.
    """
    sid = TWILIO_SIDS.get(template_key)
    if not sid or sid == "PENDIENTE_APROBACION":
        return None, None

    variables = {}

    if template_key == "resumen_pedido":
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
        def sanitize_val(val, truncate_len=None):
            if not isinstance(val, str): val = str(val)
            cleaned = val.replace('\r\n', ' - ').replace('\n', ' - ').replace('\r', ' - ')
            return cleaned[:truncate_len] if truncate_len else cleaned

        variables = {
            "1": sanitize_val(kwargs.get("negocio_nombre", "Nuestro Negocio"), 50),
            "2": sanitize_val(kwargs.get("pedido_id", "N/A"), 50),
            "3": sanitize_val("Nombre: {} Tel: {} {}".format(
                str(kwargs.get('cliente_nombre', 'Cliente'))[:30],
                str(kwargs.get('cliente_telefono', 'N/A')),
                f"Obs: {kwargs.get('obs_pedido')}" if kwargs.get('obs_pedido') and kwargs.get('obs_pedido') != "Sin notas" else ""
            ).strip(), 200),
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

    elif template_key == "pedido_en_camino":
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} Link Seguimiento / Tel Repartidor
        variables = {
            "1": kwargs.get("cliente_nombre", "Cliente"),
            "2": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "3": kwargs.get("link_seguimiento", "https://menuia.co/pedidos")
        }

    return sid, variables
