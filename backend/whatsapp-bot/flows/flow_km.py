"""
Fluxo 1: Registrar KM (saída/volta)

Steps:
0 - Selecionar veículo
1 - Selecionar tipo (saída/volta)
2 - Informar KM (com sub-step de confirmação para diferenças grandes)
3 - Enviar foto do odômetro (opcional — skip com "pular")
4 - Selecionar projeto
5 - Confirmar
"""

import logging
from datetime import date
from services.evolution_api import EvolutionAPI
from services.supabase_client import (
    get_veiculos, get_projetos, insert_registro_km,
    update_veiculo_km,
)

logger = logging.getLogger(__name__)


class FlowKM:
    def __init__(self, api: EvolutionAPI):
        self.api = api

    async def start(self, state):
        """Step 0: Listar veículos."""
        result = get_veiculos()
        veiculos = result.data if result.data else []

        if not veiculos:
            await self.api.send_text(state.phone, "❌ Nenhum veículo cadastrado no sistema.")
            return True  # finished

        state.data["veiculos"] = veiculos
        menu = "🚗 *Qual veículo?*\n\n"
        for i, v in enumerate(veiculos, 1):
            apelido = v.get("apelido") or v.get("modelo") or ""
            menu += f"{i}️⃣ {v['placa']} — {apelido}\n"
        menu += "\n_Digite o número._"

        await self.api.send_text(state.phone, menu)
        state.step = 0
        return False

    async def handle_step(self, state, msg_type: str, content: str, raw_data: dict) -> bool:
        """Retorna True se o fluxo terminou."""

        # Sub-step: confirmação de KM alto
        if state.data.get("awaiting_km_confirm"):
            return await self._step_km_confirm(state, msg_type, content)

        if state.step == 0:
            return await self._step_veiculo(state, msg_type, content)
        elif state.step == 1:
            return await self._step_tipo(state, msg_type, content)
        elif state.step == 2:
            return await self._step_km(state, msg_type, content)
        elif state.step == 3:
            return await self._step_foto(state, msg_type, content, raw_data)
        elif state.step == 4:
            return await self._step_projeto(state, msg_type, content)
        elif state.step == 5:
            return await self._step_confirmar(state, msg_type, content)

        return True

    async def _step_veiculo(self, state, msg_type, content):
        """Step 0: Selecionar veículo."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o *número* do veículo.")
            return False

        try:
            idx = int(content.strip()) - 1
            veiculos = state.data["veiculos"]
            if 0 <= idx < len(veiculos):
                state.data["veiculo"] = veiculos[idx]
                await self.api.send_text(
                    state.phone,
                    f"✅ Veículo: *{veiculos[idx]['placa']}*\n\n"
                    f"Tipo de registro?\n1️⃣ Saída\n2️⃣ Volta\n\n_Digite 1 ou 2._"
                )
                state.step = 1
                return False
            else:
                await self.api.send_text(state.phone, "⚠️ Número inválido. Tente novamente.")
                return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Digite apenas o *número*.")
            return False

    async def _step_tipo(self, state, msg_type, content):
        """Step 1: Selecionar saída ou volta."""
        if msg_type != "text" or content.strip() not in ("1", "2"):
            await self.api.send_text(state.phone, "⚠️ Digite *1* (Saída) ou *2* (Volta).")
            return False

        state.data["tipo"] = "saida" if content.strip() == "1" else "volta"
        tipo_label = "Saída" if state.data["tipo"] == "saida" else "Volta"

        # Mostrar último KM como referência
        veiculo = state.data["veiculo"]
        km_atual = veiculo.get("km_atual", 0) or 0

        await self.api.send_text(
            state.phone,
            f"📏 Tipo: *{tipo_label}*\n"
            f"KM atual registrado: *{km_atual:,.0f} km*\n\n"
            f"Qual o KM do odômetro agora?\n_Digite o valor (ex: 45230)._"
        )
        state.step = 2
        return False

    async def _step_km(self, state, msg_type, content):
        """Step 2: Informar KM."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o valor do KM.")
            return False

        try:
            # Aceitar tanto ponto quanto vírgula
            km_str = content.strip().replace(".", "").replace(",", ".")
            km = float(km_str)

            veiculo = state.data["veiculo"]
            km_atual = veiculo.get("km_atual", 0) or 0

            # Validação: KM deve ser maior que o último registro
            if km < km_atual:
                await self.api.send_text(
                    state.phone,
                    f"⚠️ KM informado ({km:,.0f}) é menor que o atual ({km_atual:,.0f}).\n"
                    f"Verifique e tente novamente."
                )
                return False

            # Validação: diferença muito grande (>1000km)
            diff = km - km_atual
            if diff > 1000:
                state.data["km_registrado"] = km
                state.data["awaiting_km_confirm"] = True
                await self.api.send_text(
                    state.phone,
                    f"⚠️ Diferença de *{diff:,.0f} km* desde o último registro.\n"
                    f"Confirma que o KM é *{km:,.0f}*? (S/N)"
                )
                return False

            state.data["km_registrado"] = km

            await self.api.send_text(
                state.phone,
                f"📸 KM: *{km:,.0f}*\n\nEnvie uma foto do odômetro ou digite *pular*."
            )
            state.step = 3
            return False

        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido. Digite apenas números (ex: 45230).")
            return False

    async def _step_km_confirm(self, state, msg_type, content):
        """Sub-step: confirmar KM com diferença grande."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
            return False

        resp = content.strip().upper()
        if resp in ("S", "SIM"):
            state.data["awaiting_km_confirm"] = False
            km = state.data["km_registrado"]
            await self.api.send_text(
                state.phone,
                f"📸 KM: *{km:,.0f}*\n\nEnvie uma foto do odômetro ou digite *pular*."
            )
            state.step = 3
            return False
        elif resp in ("N", "NAO", "NÃO"):
            state.data["awaiting_km_confirm"] = False
            await self.api.send_text(
                state.phone,
                "Ok. Digite o KM correto."
            )
            # Stays on step 2
            return False
        else:
            await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
            return False

    async def _step_foto(self, state, msg_type, content, raw_data):
        """Step 3: Foto do odômetro (opcional)."""
        if msg_type == "text" and content.strip().lower() == "pular":
            state.data["foto_odometro"] = None
        elif msg_type == "image":
            state.data["foto_odometro"] = content  # message_id por enquanto
        else:
            await self.api.send_text(state.phone, "📸 Envie uma *foto* ou digite *pular*.")
            return False

        # Listar projetos
        result = get_projetos()
        projetos = result.data if result.data else []

        if not projetos:
            state.data["projeto"] = None
            state.step = 5
            await self._show_summary(state)
            return False

        state.data["projetos"] = projetos
        menu = "📋 *Qual projeto?*\n\n"
        for i, p in enumerate(projetos, 1):
            os_label = f" (OS {p['os']})" if p.get("os") else ""
            menu += f"{i}️⃣ {p['nome']}{os_label}\n"
        menu += "\n_Digite o número._"

        await self.api.send_text(state.phone, menu)
        state.step = 4
        return False

    async def _step_projeto(self, state, msg_type, content):
        """Step 4: Selecionar projeto."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o *número* do projeto.")
            return False

        try:
            idx = int(content.strip()) - 1
            projetos = state.data["projetos"]
            if 0 <= idx < len(projetos):
                state.data["projeto"] = projetos[idx]
                state.step = 5
                await self._show_summary(state)
                return False
            else:
                await self.api.send_text(state.phone, "⚠️ Número inválido.")
                return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Digite apenas o *número*.")
            return False

    async def _show_summary(self, state):
        """Mostra resumo antes de confirmar."""
        v = state.data["veiculo"]
        tipo = "Saída" if state.data["tipo"] == "saida" else "Volta"
        km = state.data["km_registrado"]
        projeto = state.data.get("projeto")
        projeto_nome = projeto["nome"] if projeto else "Nenhum"

        # Se for volta, calcular KM percorrido
        km_info = ""
        if state.data["tipo"] == "volta":
            km_atual = v.get("km_atual", 0) or 0
            km_percorrido = km - km_atual
            km_info = f"📏 KM percorrido: *{km_percorrido:,.0f} km*\n"

        summary = (
            f"📋 *Resumo do Registro de KM*\n\n"
            f"🚗 Veículo: *{v['placa']}*\n"
            f"📍 Tipo: *{tipo}*\n"
            f"🔢 KM: *{km:,.0f}*\n"
            f"{km_info}"
            f"📁 Projeto: *{projeto_nome}*\n"
            f"📸 Foto: {'Sim' if state.data.get('foto_odometro') else 'Não'}\n\n"
            f"*Confirma?* (S/N)"
        )
        await self.api.send_text(state.phone, summary)

    async def _step_confirmar(self, state, msg_type, content):
        """Step 5: Confirmação final."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite *S* para confirmar ou *N* para cancelar.")
            return False

        resposta = content.strip().upper()
        if resposta in ("S", "SIM", "Y", "YES"):
            await self._salvar(state)
            return True
        elif resposta in ("N", "NAO", "NÃO", "NO"):
            await self.api.send_text(state.phone, "❌ Registro cancelado.")
            return True
        else:
            await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
            return False

    async def _salvar(self, state):
        """Salva o registro no Supabase."""
        try:
            veiculo = state.data["veiculo"]
            projeto = state.data.get("projeto")
            km = state.data["km_registrado"]

            registro = {
                "veiculo_id": veiculo["id"],
                "colaborador_id": state.collaborator["id"],
                "tipo": state.data["tipo"],
                "km_registrado": km,
                "data_registro": date.today().isoformat(),
                "projeto_id": projeto["id"] if projeto else None,
                "foto_odometro_url": None,
            }

            # Se for volta, calcular km_calculado
            if state.data["tipo"] == "volta":
                km_atual = veiculo.get("km_atual", 0) or 0
                registro["km_calculado"] = km - km_atual

            insert_registro_km(registro)

            # Atualizar km_atual do veículo
            update_veiculo_km(veiculo["id"], km)

            await self.api.send_text(
                state.phone,
                f"✅ *KM registrado com sucesso!*\n\n"
                f"🚗 {veiculo['placa']} — {km:,.0f} km"
            )

        except Exception as e:
            logger.error(f"Erro ao salvar KM: {e}", exc_info=True)
            await self.api.send_text(
                state.phone,
                "❌ Erro ao salvar. Tente novamente ou contacte o gestor."
            )
