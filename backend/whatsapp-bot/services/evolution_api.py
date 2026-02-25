"""Cliente para a Evolution API v2 — enviar mensagens, baixar mídia."""

import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


class EvolutionAPI:
    def __init__(self):
        self.base_url = settings.EVOLUTION_API_URL
        self.api_key = settings.EVOLUTION_API_KEY
        self.instance = settings.EVOLUTION_INSTANCE_NAME
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    async def send_text(self, phone: str, text: str):
        """Envia mensagem de texto."""
        url = f"{self.base_url}/message/sendText/{self.instance}"
        payload = {
            "number": phone,
            "text": text,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            if response.status_code != 201:
                logger.error(f"Erro ao enviar texto: {response.status_code} - {response.text}")
            return response

    async def send_media(self, phone: str, media_url: str, caption: str = "", media_type: str = "image"):
        """Envia mídia (imagem, documento, áudio)."""
        url = f"{self.base_url}/message/sendMedia/{self.instance}"
        payload = {
            "number": phone,
            "mediatype": media_type,
            "media": media_url,
            "caption": caption,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            return response

    async def get_media_base64(self, message_id: str):
        """Baixa mídia de uma mensagem como base64."""
        url = f"{self.base_url}/chat/getBase64FromMediaMessage/{self.instance}"
        payload = {"message": {"key": {"id": message_id}}}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                return data.get("base64", "")
            else:
                logger.error(f"Erro ao baixar mídia: {response.status_code}")
                return None

    async def create_instance(self):
        """Cria instância WhatsApp (chamado uma vez no setup)."""
        url = f"{self.base_url}/instance/create"
        payload = {
            "instanceName": self.instance,
            "integration": "WHATSAPP-BAILEYS",
            "qrcode": True,
            "webhook": "https://bot.powerconcept.com.br/webhook/evolution",
            "webhookByEvents": True,
            "webhookBase64": True,
            "webhookEvents": [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE",
                "QRCODE_UPDATED",
            ],
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            return response.json()

    async def get_qrcode(self):
        """Obtém QR Code para conectar WhatsApp."""
        url = f"{self.base_url}/instance/connect/{self.instance}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            return response.json()
