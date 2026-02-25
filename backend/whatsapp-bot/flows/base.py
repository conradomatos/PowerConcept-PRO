"""
State Machine para gerenciar conversas do WhatsApp.
Cada colaborador tem um estado independente (em memória).
"""

import logging
from typing import Optional
from datetime import datetime, timedelta

from services.evolution_api import EvolutionAPI
from services.supabase_client import get_collaborator_by_phone

logger = logging.getLogger(__name__)

# Timeout de conversa: 10 minutos sem interação reseta pro menu
CONVERSATION_TIMEOUT = timedelta(minutes=10)

MENU_PRINCIPAL = """🚗 *PowerConcept — Gestão de Frotas*

1️⃣ Registrar KM (saída/volta)
2️⃣ Registrar abastecimento
3️⃣ Registrar despesa (pedágio, etc.)
4️⃣ Apontar atividade
5️⃣ Enviar comprovante/NF
0️⃣ Ajuda

_Digite o número da opção desejada._"""

MENU_AJUDA = """ℹ️ *Ajuda — Bot de Frotas*

Este bot permite que você registre informações de frotas diretamente pelo WhatsApp:

*1. KM* — Registre quilometragem de saída e volta
*2. Abastecimento* — Tire foto do cupom fiscal e o sistema extrai tudo automaticamente
*3. Despesa* — Pedágio, estacionamento, lavagem, etc.
*4. Apontamento* — Registre atividades realizadas (texto ou áudio)
*5. Comprovante* — Envie notas e recibos

Para cancelar qualquer operação, digite *cancelar* ou *menu*.

_Dúvidas? Fale com o gestor._"""


class ConversationState:
    """Estado de uma conversa individual."""

    def __init__(self, phone: str, collaborator: dict):
        self.phone = phone
        self.collaborator = collaborator
        self.flow: Optional[str] = None  # Nome do fluxo ativo
        self.step: int = 0               # Passo atual dentro do fluxo
        self.data: dict = {}             # Dados acumulados no fluxo
        self.last_interaction: datetime = datetime.utcnow()

    def reset(self):
        """Volta pro menu principal."""
        self.flow = None
        self.step = 0
        self.data = {}
        self.last_interaction = datetime.utcnow()

    def is_expired(self) -> bool:
        return datetime.utcnow() - self.last_interaction > CONVERSATION_TIMEOUT

    def touch(self):
        self.last_interaction = datetime.utcnow()


class ConversationManager:
    """Gerencia todas as conversas ativas."""

    def __init__(self, evolution_api: EvolutionAPI):
        self.api = evolution_api
        self.conversations: dict[str, ConversationState] = {}
        self._flows = {}
        self._register_flows()

    def _register_flows(self):
        """Registra os fluxos disponíveis."""
        from flows.flow_km import FlowKM
        from flows.flow_abastecimento import FlowAbastecimento
        from flows.flow_despesa import FlowDespesa
        from flows.flow_apontamento import FlowApontamento
        from flows.flow_comprovante import FlowComprovante

        self._flows = {
            "km": FlowKM(self.api),
            "abastecimento": FlowAbastecimento(self.api),
            "despesa": FlowDespesa(self.api),
            "apontamento": FlowApontamento(self.api),
            "comprovante": FlowComprovante(self.api),
        }

    async def handle(self, phone: str, msg_type: str, content: str, raw_data: dict):
        """Ponto de entrada: recebe mensagem e roteia pro fluxo correto."""

        # 1. Obter ou criar estado da conversa
        state = self.conversations.get(phone)

        if state is None or state.is_expired():
            # Autenticar colaborador
            collaborator = await self._authenticate(phone)
            if collaborator is None:
                await self.api.send_text(
                    phone,
                    "❌ Número não cadastrado. Procure o gestor para vincular seu WhatsApp ao sistema."
                )
                return
            state = ConversationState(phone, collaborator)
            self.conversations[phone] = state

        state.touch()

        # 2. Verificar comandos globais
        if msg_type == "text":
            text_lower = content.strip().lower()
            if text_lower in ("cancelar", "menu", "voltar", "sair"):
                state.reset()
                await self.api.send_text(phone, MENU_PRINCIPAL)
                return
            if text_lower == "0" or text_lower == "ajuda":
                await self.api.send_text(phone, MENU_AJUDA)
                return

        # 3. Se não há fluxo ativo, estamos no menu principal
        if state.flow is None:
            if msg_type == "text":
                choice = content.strip()
                flow_map = {
                    "1": "km",
                    "2": "abastecimento",
                    "3": "despesa",
                    "4": "apontamento",
                    "5": "comprovante",
                }
                if choice in flow_map:
                    state.flow = flow_map[choice]
                    state.step = 0
                    state.data = {}
                    await self._flows[state.flow].start(state)
                else:
                    await self.api.send_text(phone, MENU_PRINCIPAL)
            else:
                await self.api.send_text(phone, MENU_PRINCIPAL)
            return

        # 4. Delegar para o fluxo ativo
        flow = self._flows.get(state.flow)
        if flow:
            finished = await flow.handle_step(state, msg_type, content, raw_data)
            if finished:
                state.reset()
                await self.api.send_text(phone, MENU_PRINCIPAL)

    async def _authenticate(self, phone: str) -> Optional[dict]:
        """Busca colaborador pelo número de WhatsApp."""
        try:
            result = get_collaborator_by_phone(phone)
            return result.data if result.data else None
        except Exception:
            return None
