"""Transcrição de áudio via OpenAI Whisper API."""

import base64
import io
import logging
from openai import OpenAI
from config import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def transcribe_audio(audio_base64: str, format: str = "ogg") -> str:
    """
    Recebe áudio em base64 (vindo da Evolution API),
    transcreve via Whisper e retorna texto.
    """
    try:
        if "," in audio_base64:
            audio_base64 = audio_base64.split(",")[1]

        audio_bytes = base64.b64decode(audio_base64)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = f"audio.{format}"

        transcription = _get_client().audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="pt",
        )

        return transcription.text

    except Exception as e:
        logger.error(f"Erro na transcrição: {e}")
        return ""
