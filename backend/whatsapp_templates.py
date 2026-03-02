import json
import logging

logger = logging.getLogger(__name__)

# --- CONFIGURACIÓN DE IDS DE TWILIO ---
# REEMPLAZA estos valores con los 'Content SID' que te asigne Twilio (ej: HXxxxxxxxx...)
TWILIO_SIDS = {
    "resumen_pedido": "PENDIENTE_APROBACION",      # Plantilla: resumen_pedido_v3_link
    "fidelidad": "PENDIENTE_APROBACION",           # Plantilla: notificacion_fidelidad_v1
    "cumpleanos": "PENDIENTE_APROBACION",          # Plantilla: felicitacion_cumple_negocio
    "campana_marketing": "PENDIENTE_APROBACION"    # Plantilla: campana_masiva_custom
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
            "3": f"Nombre: {kwargs.get('cliente_nombre')}\nTel: {kwargs.get('cliente_telefono')}",
            "4": kwargs.get("detalle_carrito", "Detalle no disponible"),
            "5": f"Dirección: {kwargs.get('direccion')}\nDistancia: {kwargs.get('distancia', 'N/A')}",
            "6": kwargs.get("resumen_pago", "$0"),
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

    return sid, json.dumps(variables)
