import sys, asyncio, os
from dotenv import load_dotenv
load_dotenv()
from whatsapp_agent import create_order_ai

async def main():
    res = await create_order_ai('37a07d0f-e8b4-4f23-bfe9-02be72d76c28', {
        'items':[{'nombre':'Hamburguesa','cantidad':1,'precio':15000}],
        'tipo':'llevar',
        'cliente_nombre': 'Test',
        'cliente_telefono': '3000000000',
        'metodo_pago': 'Efectivo'
    })
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(main())
