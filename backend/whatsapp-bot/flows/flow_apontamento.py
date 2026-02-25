"""
Fluxo 4: Apontar Atividade

Steps:
0 - Selecionar projeto
1 - Descrição da atividade (texto ou áudio)
2 - (Se áudio) Confirmar transcrição
3 - Informar horas (opcional — pular para default 1h)
4 - Foto (opcional — pular)
5 - Confirmar e salvar
"""

import logging
from datetime import date
from services.evolution_api import EvolutionAPI
from services.whisper_service import transcribe_audio
from services.supabase_client import (
    get_projetos, insert_apontamento_dia, insert_apontamento_item, get_client,
)

logger = logging.getLogger(__name__)


class FlowApontamento:
    def __init__(self, api: EvolutionAPI):
        self.api = api

    async def start(self, state):
        """Step 0: Listar projetos."""
        result = get_projetos()
        projetos = result.data if result.data else []
        if not projetos:
            await self.api.send_text(state.phone, "❌ Nenhum projeto ativo cadastrado.")
            return True
        state.data["projetos"] = projetos
        menu = "📋 *Apontar Atividade*\n\nQual projeto?\n\n"
        for i, p in enumerate(projetos, 1):
            os_label = f" (OS {p['os']})" if p.get("os") else ""
            menu += f"{i}️⃣ {p['nome']}{os_label}\n"
        menu += "\n_Digite o número._"
        await self.api.send_text(state.phone, menu)
        state.step = 0
        return False

    async def handle_step(self, state, msg_type, content, raw_data) -> bool:
        if state.step == 0:
            return await self._step_projeto(state, msg_type, content)
        elif state.step == 1:
            return await self._step_descricao(state, msg_type, content, raw_data)
        elif state.step == 2:
            return await self._step_confirmar_transcricao(state, msg_type, content)
        elif state.step == 3:
            return await self._step_horas(state, msg_type, content)
        elif state.step == 4:
            return await self._step_foto(state, msg_type, content, raw_data)
        elif state.step == 5:
            return await self._step_confirmar(state, msg_type, content)
        return True

    async def _step_projeto(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o *número* do projeto.")
            return False
        try:
            idx = int(content.strip()) - 1
            projetos = state.data["projetos"]
            if 0 <= idx < len(projetos):
                state.data["projeto"] = projetos[idx]
                await self.api.send_text(
                    state.phone,
                    f"✅ Projeto: *{projetos[idx]['nome']}*\n\n"
                    f"📝 Descreva a atividade realizada.\n"
                    f"_Pode enviar um texto ou um áudio._"
                )
                state.step = 1
                return False
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _step_descricao(self, state, msg_type, content, raw_data):
        if msg_type == "text":
            state.data["descricao"] = content.strip()
            await self.api.send_text(
                state.phone,
                f"⏰ Quantas *horas* nesta atividade? (ex: 2.5)\n"
                f"_Digite *pular* para registrar 1h._"
            )
            state.step = 3
            return False
        elif msg_type == "audio":
            await self.api.send_text(state.phone, "🎤 Transcrevendo áudio...")
            base64_data = await self.api.get_media_base64(content)
            if base64_data:
                texto = await transcribe_audio(base64_data)
                if texto:
                    state.data["descricao_audio"] = texto
                    await self.api.send_text(
                        state.phone,
                        f"📝 *Transcrição:*\n_{texto}_\n\n"
                        f"Texto correto? (S/N)"
                    )
                    state.step = 2
                    return False
                else:
                    await self.api.send_text(
                        state.phone,
                        "⚠️ Não consegui transcrever o áudio. Envie um *texto* com a descrição."
                    )
                    return False
            else:
                await self.api.send_text(
                    state.phone,
                    "⚠️ Não consegui baixar o áudio. Tente novamente ou envie um *texto*."
                )
                return False
        else:
            await self.api.send_text(state.phone, "📝 Envie um *texto* ou *áudio* com a descrição.")
            return False

    async def _step_confirmar_transcricao(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
            return False
        resp = content.strip().upper()
        if resp in ("S", "SIM"):
            state.data["descricao"] = state.data["descricao_audio"]
            await self.api.send_text(
                state.phone,
                f"⏰ Quantas *horas* nesta atividade? (ex: 2.5)\n"
                f"_Digite *pular* para registrar 1h._"
            )
            state.step = 3
            return False
        elif resp in ("N", "NAO", "NÃO"):
            await self.api.send_text(
                state.phone,
                "📝 Ok, envie o texto correto da descrição."
            )
            state.step = 1
            return False
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _step_horas(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o número de horas ou *pular*.")
            return False
        if content.strip().lower() == "pular":
            state.data["horas"] = 1.0
        else:
            try:
                horas = float(content.strip().replace(",", "."))
                if horas <= 0 or horas > 24:
                    await self.api.send_text(state.phone, "⚠️ Horas deve ser entre 0 e 24.")
                    return False
                state.data["horas"] = horas
            except ValueError:
                await self.api.send_text(state.phone, "⚠️ Valor inválido. Ex: 2.5")
                return False

        await self.api.send_text(
            state.phone,
            f"📸 Envie uma *foto* do serviço/atividade ou digite *pular*."
        )
        state.step = 4
        return False

    async def _step_foto(self, state, msg_type, content, raw_data):
        if msg_type == "text" and content.strip().lower() == "pular":
            state.data["foto"] = None
        elif msg_type == "image":
            state.data["foto"] = content  # message_id
        else:
            await self.api.send_text(state.phone, "📸 Envie uma *foto* ou digite *pular*.")
            return False

        state.step = 5
        await self._show_summary(state)
        return False

    async def _show_summary(self, state):
        projeto = state.data["projeto"]
        msg = (
            f"📋 *Resumo do Apontamento*\n\n"
            f"📁 Projeto: *{projeto['nome']}*\n"
            f"📝 Descrição: {state.data.get('descricao', '-')}\n"
            f"⏰ Horas: *{state.data.get('horas', 1.0):.1f}h*\n"
            f"📸 Foto: {'Sim' if state.data.get('foto') else 'Não'}\n\n"
            f"*Confirma?* (S/N)"
        )
        await self.api.send_text(state.phone, msg)

    async def _step_confirmar(self, state, msg_type, content):
        if msg_type != "text":
            return False
        resp = content.strip().upper()
        if resp in ("S", "SIM"):
            await self._salvar(state)
            return True
        elif resp in ("N", "NAO", "NÃO"):
            await self.api.send_text(state.phone, "❌ Apontamento cancelado.")
            return True
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _salvar(self, state):
        try:
            projeto = state.data["projeto"]
            colaborador_id = state.collaborator["id"]
            user_id = state.collaborator.get("user_id")
            hoje = date.today().isoformat()

            # 1. Buscar ou criar apontamento_dia
            client = get_client()
            existing = client.table("apontamento_dia") \
                .select("id") \
                .eq("colaborador_id", colaborador_id) \
                .eq("data", hoje) \
                .maybeSingle() \
                .execute()

            if existing.data:
                dia_id = existing.data["id"]
            else:
                dia_result = insert_apontamento_dia({
                    "colaborador_id": colaborador_id,
                    "data": hoje,
                    "status": "RASCUNHO",
                    "created_by": user_id,
                })
                dia_id = dia_result.data["id"]

            # 2. Inserir apontamento_item
            insert_apontamento_item({
                "apontamento_dia_id": dia_id,
                "projeto_id": projeto["id"],
                "horas": state.data.get("horas", 1.0),
                "descricao": state.data.get("descricao"),
                "tipo_hora": "NORMAL",
                "is_overhead": False,
                "created_by": user_id,
            })

            await self.api.send_text(
                state.phone,
                f"✅ *Atividade registrada!*\n"
                f"📁 {projeto['nome']} — {state.data.get('horas', 1.0):.1f}h"
            )
        except Exception as e:
            logger.error(f"Erro ao salvar apontamento: {e}", exc_info=True)
            await self.api.send_text(state.phone, "❌ Erro ao salvar. Tente novamente.")
