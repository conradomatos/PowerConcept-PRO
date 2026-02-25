"""
PowerConcept WhatsApp Bot — Gestão de Frotas
FastAPI app que recebe webhooks da Evolution API e gerencia fluxos de conversa.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from services.supabase_client import init_supabase
from services.evolution_api import EvolutionAPI
from services.alertas import AlertScheduler
from flows.base import ConversationManager

# Configurar logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Estado global
conversation_manager: ConversationManager = None
evolution_api: EvolutionAPI = None
alert_scheduler: AlertScheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialização e shutdown."""
    global conversation_manager, evolution_api, alert_scheduler

    # Startup
    logger.info("Iniciando WhatsApp Bot...")
    init_supabase()
    evolution_api = EvolutionAPI()
    conversation_manager = ConversationManager(evolution_api)
    alert_scheduler = AlertScheduler(evolution_api)
    alert_scheduler.start()
    logger.info("WhatsApp Bot iniciado com sucesso.")

    yield

    # Shutdown
    alert_scheduler.stop()
    logger.info("WhatsApp Bot encerrado.")


app = FastAPI(
    title="PowerConcept WhatsApp Bot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PowerConcept WhatsApp Bot"}


@app.post("/webhook/evolution")
async def webhook_evolution(request: Request):
    """
    Recebe todos os webhooks da Evolution API.
    Eventos relevantes: MESSAGES_UPSERT (mensagem recebida).
    """
    body = await request.json()
    event = body.get("event")

    if event == "messages.upsert":
        await handle_message(body)
    elif event == "qrcode.updated":
        logger.info(f"QR Code atualizado para instância: {body.get('instance')}")
    elif event == "connection.update":
        state = body.get("data", {}).get("state")
        logger.info(f"Estado da conexão: {state}")

    return {"status": "received"}


async def handle_message(body: dict):
    """Processa mensagem recebida do WhatsApp."""
    try:
        data = body.get("data", {})
        key = data.get("key", {})

        # Ignorar mensagens enviadas pelo próprio bot
        if key.get("fromMe"):
            return

        remote_jid = key.get("remoteJid", "")
        # Extrair número (formato: 5541999999999@s.whatsapp.net)
        phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid

        # Ignorar grupos
        if "@g.us" in remote_jid:
            return

        # Extrair conteúdo da mensagem
        message = data.get("message", {})
        msg_type = None
        msg_content = None

        if "conversation" in message:
            msg_type = "text"
            msg_content = message["conversation"]
        elif "extendedTextMessage" in message:
            msg_type = "text"
            msg_content = message["extendedTextMessage"].get("text", "")
        elif "imageMessage" in message:
            msg_type = "image"
            msg_content = key.get("id")  # message ID para download
        elif "audioMessage" in message:
            msg_type = "audio"
            msg_content = key.get("id")
        elif "documentMessage" in message:
            msg_type = "document"
            msg_content = key.get("id")

        if msg_type and msg_content:
            await conversation_manager.handle(
                phone=phone,
                msg_type=msg_type,
                content=msg_content,
                raw_data=data,
            )

    except Exception as e:
        logger.error(f"Erro ao processar mensagem: {e}", exc_info=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.BOT_HOST, port=settings.BOT_PORT)
