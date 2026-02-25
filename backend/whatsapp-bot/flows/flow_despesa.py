"""
Fluxo 3: Registrar Despesa de Deslocamento

Steps:
0 - Selecionar veículo
1 - Selecionar projeto
2 - Selecionar tipo (pedágio, estacionamento, lavagem, outro)
3 - Informar valor
4 - Descrição (opcional — pular)
5 - Foto do comprovante (opcional — pular)
6 - Confirmar e salvar
"""

import logging
from datetime import date
from services.evolution_api import EvolutionAPI
from services.supabase_client import get_veiculos, get_projetos, insert_despesa

logger = logging.getLogger(__name__)

TIPO_DESPESA = {
    "1": ("pedagio", "Pedágio"),
    "2": ("estacionamento", "Estacionamento"),
    "3": ("lavagem", "Lavagem"),
    "4": ("outro", "Outro"),
}


class FlowDespesa:
    def __init__(self, api: EvolutionAPI):
        self.api = api

    async def start(self, state):
        """Step 0: Listar veículos."""
        result = get_veiculos()
        veiculos = result.data if result.data else []
        if not veiculos:
            await self.api.send_text(state.phone, "❌ Nenhum veículo cadastrado.")
            return True
        state.data["veiculos"] = veiculos
        menu = "🧾 *Registrar Despesa*\n\nQual veículo?\n\n"
        for i, v in enumerate(veiculos, 1):
            apelido = v.get("apelido") or v.get("modelo") or ""
            menu += f"{i}️⃣ {v['placa']} — {apelido}\n"
        menu += "\n_Digite o número._"
        await self.api.send_text(state.phone, menu)
        state.step = 0
        return False

    async def handle_step(self, state, msg_type, content, raw_data) -> bool:
        if state.step == 0:
            return await self._step_veiculo(state, msg_type, content)
        elif state.step == 1:
            return await self._step_projeto(state, msg_type, content)
        elif state.step == 2:
            return await self._step_tipo(state, msg_type, content)
        elif state.step == 3:
            return await self._step_valor(state, msg_type, content)
        elif state.step == 4:
            return await self._step_descricao(state, msg_type, content)
        elif state.step == 5:
            return await self._step_foto(state, msg_type, content, raw_data)
        elif state.step == 6:
            return await self._step_confirmar(state, msg_type, content)
        return True

    async def _step_veiculo(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o *número* do veículo.")
            return False
        try:
            idx = int(content.strip()) - 1
            veiculos = state.data["veiculos"]
            if 0 <= idx < len(veiculos):
                state.data["veiculo"] = veiculos[idx]
                # Listar projetos
                result = get_projetos()
                projetos = result.data if result.data else []
                if not projetos:
                    state.data["projeto"] = None
                    state.step = 2
                    await self._show_tipo_menu(state)
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
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _step_projeto(self, state, msg_type, content):
        if msg_type != "text":
            return False
        try:
            idx = int(content.strip()) - 1
            projetos = state.data["projetos"]
            if 0 <= idx < len(projetos):
                state.data["projeto"] = projetos[idx]
                state.step = 2
                await self._show_tipo_menu(state)
                return False
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _show_tipo_menu(self, state):
        menu = (
            "📝 *Tipo de despesa:*\n\n"
            "1️⃣ Pedágio\n"
            "2️⃣ Estacionamento\n"
            "3️⃣ Lavagem\n"
            "4️⃣ Outro\n\n"
            "_Digite o número._"
        )
        await self.api.send_text(state.phone, menu)

    async def _step_tipo(self, state, msg_type, content):
        if msg_type != "text" or content.strip() not in TIPO_DESPESA:
            await self.api.send_text(state.phone, "⚠️ Digite *1*, *2*, *3* ou *4*.")
            return False
        tipo_key, tipo_label = TIPO_DESPESA[content.strip()]
        state.data["tipo"] = tipo_key
        state.data["tipo_label"] = tipo_label
        await self.api.send_text(state.phone, f"💰 Tipo: *{tipo_label}*\n\nQual o *valor* em R$? (ex: 15.50)")
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
                f"📝 Valor: *R$ {valor:.2f}*\n\n"
                f"Adicionar uma *descrição*? (ou digite *pular*)"
            )
            state.step = 4
            return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido. Ex: 15.50")
            return False

    async def _step_descricao(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite uma descrição ou *pular*.")
            return False
        if content.strip().lower() == "pular":
            state.data["descricao"] = None
        else:
            state.data["descricao"] = content.strip()

        await self.api.send_text(
            state.phone,
            "📸 Envie uma *foto do comprovante* ou digite *pular*."
        )
        state.step = 5
        return False

    async def _step_foto(self, state, msg_type, content, raw_data):
        if msg_type == "text" and content.strip().lower() == "pular":
            state.data["comprovante"] = None
        elif msg_type == "image":
            state.data["comprovante"] = content  # message_id
        else:
            await self.api.send_text(state.phone, "📸 Envie uma *foto* ou digite *pular*.")
            return False

        state.step = 6
        await self._show_summary(state)
        return False

    async def _show_summary(self, state):
        v = state.data["veiculo"]
        projeto = state.data.get("projeto")
        msg = (
            f"📋 *Resumo da Despesa*\n\n"
            f"🚗 Veículo: *{v['placa']}*\n"
            f"📁 Projeto: *{projeto['nome'] if projeto else 'Nenhum'}*\n"
            f"📝 Tipo: *{state.data['tipo_label']}*\n"
            f"💰 Valor: *R$ {state.data['valor']:.2f}*\n"
            f"📄 Descrição: {state.data.get('descricao') or 'Nenhuma'}\n"
            f"📸 Comprovante: {'Sim' if state.data.get('comprovante') else 'Não'}\n\n"
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
            await self.api.send_text(state.phone, "❌ Despesa cancelada.")
            return True
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _salvar(self, state):
        try:
            veiculo = state.data["veiculo"]
            projeto = state.data.get("projeto")

            registro = {
                "veiculo_id": veiculo["id"],
                "colaborador_id": state.collaborator["id"],
                "projeto_id": projeto["id"] if projeto else None,
                "tipo": state.data["tipo"],
                "valor": state.data["valor"],
                "descricao": state.data.get("descricao"),
                "comprovante_url": None,  # TODO: upload da foto ao Storage
                "data_despesa": date.today().isoformat(),
            }

            insert_despesa(registro)

            await self.api.send_text(
                state.phone,
                f"✅ *Despesa registrada!*\n"
                f"🚗 {veiculo['placa']} — {state.data['tipo_label']} — R$ {state.data['valor']:.2f}"
            )
        except Exception as e:
            logger.error(f"Erro ao salvar despesa: {e}", exc_info=True)
            await self.api.send_text(state.phone, "❌ Erro ao salvar. Tente novamente.")
