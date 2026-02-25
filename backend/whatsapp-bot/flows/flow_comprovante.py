"""
Fluxo 5: Enviar Comprovante/NF

Steps:
0 - Selecionar tipo (NF, Recibo, Outro)
1 - Selecionar projeto
2 - Enviar foto do comprovante
3 - Informar valor
4 - Descrição (opcional — pular)
5 - Confirmar e salvar
"""

import logging
import uuid
import base64
from datetime import date
from services.evolution_api import EvolutionAPI
from services.supabase_client import get_projetos, get_client, upload_comprovante, get_public_url

logger = logging.getLogger(__name__)

TIPO_COMPROVANTE = {
    "1": ("nf", "Nota Fiscal"),
    "2": ("recibo", "Recibo"),
    "3": ("outro", "Outro"),
}


class FlowComprovante:
    def __init__(self, api: EvolutionAPI):
        self.api = api

    async def start(self, state):
        """Step 0: Selecionar tipo."""
        menu = (
            "📄 *Enviar Comprovante*\n\n"
            "Qual o tipo?\n\n"
            "1️⃣ Nota Fiscal\n"
            "2️⃣ Recibo\n"
            "3️⃣ Outro\n\n"
            "_Digite o número._"
        )
        await self.api.send_text(state.phone, menu)
        state.step = 0
        return False

    async def handle_step(self, state, msg_type, content, raw_data) -> bool:
        if state.step == 0:
            return await self._step_tipo(state, msg_type, content)
        elif state.step == 1:
            return await self._step_projeto(state, msg_type, content)
        elif state.step == 2:
            return await self._step_foto(state, msg_type, content, raw_data)
        elif state.step == 3:
            return await self._step_valor(state, msg_type, content)
        elif state.step == 4:
            return await self._step_descricao(state, msg_type, content)
        elif state.step == 5:
            return await self._step_confirmar(state, msg_type, content)
        return True

    async def _step_tipo(self, state, msg_type, content):
        if msg_type != "text" or content.strip() not in TIPO_COMPROVANTE:
            await self.api.send_text(state.phone, "⚠️ Digite *1*, *2* ou *3*.")
            return False
        tipo_key, tipo_label = TIPO_COMPROVANTE[content.strip()]
        state.data["tipo"] = tipo_key
        state.data["tipo_label"] = tipo_label

        # Listar projetos
        result = get_projetos()
        projetos = result.data if result.data else []
        if not projetos:
            state.data["projeto"] = None
            state.step = 2
            await self.api.send_text(state.phone, "📸 Envie a *foto do comprovante*.")
            return False
        state.data["projetos"] = projetos
        menu = "📋 *Qual projeto?*\n\n"
        for i, p in enumerate(projetos, 1):
            os_label = f" (OS {p['os']})" if p.get("os") else ""
            menu += f"{i}️⃣ {p['nome']}{os_label}\n"
        menu += "\n_Digite o número._"
        await self.api.send_text(state.phone, menu)
        state.step = 1
        return False

    async def _step_projeto(self, state, msg_type, content):
        if msg_type != "text":
            return False
        try:
            idx = int(content.strip()) - 1
            projetos = state.data["projetos"]
            if 0 <= idx < len(projetos):
                state.data["projeto"] = projetos[idx]
                await self.api.send_text(state.phone, "📸 Envie a *foto do comprovante*.")
                state.step = 2
                return False
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _step_foto(self, state, msg_type, content, raw_data):
        if msg_type != "image":
            await self.api.send_text(state.phone, "📸 Envie uma *foto* do comprovante.")
            return False

        state.data["foto_msg_id"] = content
        await self.api.send_text(
            state.phone,
            "💰 Qual o *valor* do comprovante em R$? (ex: 150.00)"
        )
        state.step = 3
        return False

    async def _step_valor(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o valor.")
            return False
        try:
            valor = float(content.strip().replace(",", ".").replace("R$", "").strip())
            if valor <= 0:
                await self.api.send_text(state.phone, "⚠️ Valor deve ser maior que zero.")
                return False
            state.data["valor"] = valor
            await self.api.send_text(
                state.phone,
                "📝 Adicionar uma *descrição*? (ou digite *pular*)"
            )
            state.step = 4
            return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido. Ex: 150.00")
            return False

    async def _step_descricao(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite uma descrição ou *pular*.")
            return False
        if content.strip().lower() == "pular":
            state.data["descricao"] = None
        else:
            state.data["descricao"] = content.strip()

        state.step = 5
        await self._show_summary(state)
        return False

    async def _show_summary(self, state):
        projeto = state.data.get("projeto")
        msg = (
            f"📋 *Resumo do Comprovante*\n\n"
            f"📄 Tipo: *{state.data['tipo_label']}*\n"
            f"📁 Projeto: *{projeto['nome'] if projeto else 'Nenhum'}*\n"
            f"💰 Valor: *R$ {state.data['valor']:.2f}*\n"
            f"📝 Descrição: {state.data.get('descricao') or 'Nenhuma'}\n"
            f"📸 Foto: Sim\n\n"
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
            await self.api.send_text(state.phone, "❌ Comprovante cancelado.")
            return True
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _salvar(self, state):
        try:
            projeto = state.data.get("projeto")
            colaborador_id = state.collaborator["id"]

            # 1. Upload da foto ao Supabase Storage
            foto_url = None
            foto_msg_id = state.data.get("foto_msg_id")
            if foto_msg_id:
                base64_data = await self.api.get_media_base64(foto_msg_id)
                if base64_data:
                    try:
                        # Remover header se presente
                        raw_b64 = base64_data.split(",")[1] if "," in base64_data else base64_data
                        file_bytes = base64.b64decode(raw_b64)
                        file_name = f"comprovantes/{date.today().isoformat()}/{uuid.uuid4()}.jpg"
                        upload_comprovante("frotas", file_name, file_bytes, "image/jpeg")
                        foto_url = get_public_url("frotas", file_name)
                    except Exception as upload_err:
                        logger.warning(f"Erro ao fazer upload do comprovante: {upload_err}")

            # 2. Salvar como despesa de deslocamento com tipo "outro"
            client = get_client()
            client.table("despesas_deslocamento").insert({
                "veiculo_id": None,  # comprovante não necessariamente vinculado a veículo
                "colaborador_id": colaborador_id,
                "projeto_id": projeto["id"] if projeto else None,
                "tipo": "outro",
                "valor": state.data["valor"],
                "descricao": f"[{state.data['tipo_label']}] {state.data.get('descricao') or ''}".strip(),
                "comprovante_url": foto_url,
                "data_despesa": date.today().isoformat(),
            }).execute()

            await self.api.send_text(
                state.phone,
                f"✅ *Comprovante salvo!*\n"
                f"📄 {state.data['tipo_label']} — R$ {state.data['valor']:.2f}"
            )
        except Exception as e:
            logger.error(f"Erro ao salvar comprovante: {e}", exc_info=True)
            await self.api.send_text(state.phone, "❌ Erro ao salvar. Tente novamente.")
