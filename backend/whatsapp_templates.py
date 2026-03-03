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
    "codigo_verificacion": "PENDIENTE_APROBACION"                # Plantilla: verificacion_otp
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
        # variables: {{1}} Negocio, {{2}} ID, {{3}} Cliente Info, {{4}} Detalle, {{5}} Entrega, {{6}} Pago, {{7}} Met_Pago, {{8}} Met_Entrega, {{9}} Fecha, {{10}} Link
        variables = {
            "1": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "2": kwargs.get("pedido_id", "N/A"),
            "3": f"Nombre: {kwargs.get('cliente_nombre')} | Teléfono: {kwargs.get('cliente_telefono')}",
            "4": str(kwargs.get("detalle_carrito", "Detalle no disponible")).replace('\n', ', '),
            "5": f"Dirección: {kwargs.get('direccion')} | Distancia: {kwargs.get('distancia', 'N/A')}",
            "6": f"Subtotal: ${kwargs.get('subtotal', '0')} | Envío: ${kwargs.get('costo_envio', '0')} | TOTAL: ${kwargs.get('total', '0')}",
            "7": kwargs.get("metodo_pago", "Efectivo"),
            "8": kwargs.get("metodo_entrega", "Domicilio"),
            "9": kwargs.get("fecha", ""),
            "10": kwargs.get("link_seguimiento", "https://menuia.co")
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
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} OTP Code, {{4}} Link
        variables = {
            "1": kwargs.get("cliente_nombre", "Usuario"),
            "2": kwargs.get("negocio_nombre", "Menu.IA"),
            "3": kwargs.get("otp_code", ""),
            "4": kwargs.get("link", "https://menuia.co")
        }

    elif template_key == "pedido_en_camino":
        # variables: {{1}} Cliente, {{2}} Negocio, {{3}} Link Seguimiento / Tel Repartidor
        variables = {
            "1": kwargs.get("cliente_nombre", "Cliente"),
            "2": kwargs.get("negocio_nombre", "Nuestro Negocio"),
            "3": kwargs.get("link_seguimiento", "https://menuia.co/pedidos")
        }

    return sid, json.dumps(variables)
