"""
Fluxo 2: Registrar Abastecimento

Steps:
0 - Selecionar veículo
1 - Enviar foto do cupom fiscal ou "manual"
2 - Confirmar dados extraídos automaticamente (S/N)
3 - Fallback manual: litros
4 - Fallback manual: valor total
5 - Informar KM
6 - Selecionar projeto
7 - Confirmar e salvar
"""

import logging
from services.evolution_api import EvolutionAPI
from services.qrcode_nfce import extract_nfce_from_base64
from services.supabase_client import (
    get_veiculos, get_projetos, insert_abastecimento,
    update_veiculo_km, get_ultimo_abastecimento,
)

logger = logging.getLogger(__name__)


class FlowAbastecimento:
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
        menu = "⛽ *Registrar Abastecimento*\n\nQual veículo?\n\n"
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
            return await self._step_foto_cupom(state, msg_type, content, raw_data)
        elif state.step == 2:
            return await self._step_confirmar_nfce(state, msg_type, content)
        elif state.step == 3:
            return await self._step_manual_litros(state, msg_type, content)
        elif state.step == 4:
            return await self._step_manual_valor(state, msg_type, content)
        elif state.step == 5:
            return await self._step_km(state, msg_type, content)
        elif state.step == 6:
            return await self._step_projeto(state, msg_type, content)
        elif state.step == 7:
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
                await self.api.send_text(
                    state.phone,
                    f"✅ Veículo: *{veiculos[idx]['placa']}*\n\n"
                    f"📸 Envie a *foto do cupom fiscal* (com QR Code visível)\n"
                    f"ou digite *manual* para digitar os dados."
                )
                state.step = 1
                return False
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _step_foto_cupom(self, state, msg_type, content, raw_data):
        if msg_type == "text" and content.strip().lower() == "manual":
            await self.api.send_text(state.phone, "⛽ Quantos *litros*? (ex: 57.32)")
            state.step = 3
            state.data["modo"] = "manual"
            return False

        if msg_type == "image":
            await self.api.send_text(state.phone, "🔍 Processando cupom fiscal...")
            msg_id = content
            base64_data = await self.api.get_media_base64(msg_id)

            if base64_data:
                nfce_data = extract_nfce_from_base64(base64_data)
                if "error" not in nfce_data and nfce_data.get("combustivel"):
                    comb = nfce_data["combustivel"]
                    emit = nfce_data.get("emitente", {})
                    pag = nfce_data.get("pagamento", {})

                    state.data["nfce"] = nfce_data
                    state.data["modo"] = "auto"

                    msg = (
                        f"✅ *Dados extraídos do cupom:*\n\n"
                        f"⛽ {comb.get('litros', 0):.2f}L {comb.get('tipo', 'Combustível')}\n"
                        f"💰 R$ {comb.get('valor_total', 0):.2f} (R$ {comb.get('preco_litro', 0):.2f}/L)\n"
                        f"🏪 {emit.get('nome', 'N/I')}\n"
                    )
                    if pag.get("forma"):
                        msg += f"💳 {pag['forma']}"
                        if pag.get("bandeira"):
                            msg += f" {pag['bandeira']}"
                        if pag.get("ultimos_digitos"):
                            msg += f" final {pag['ultimos_digitos']}"
                        msg += "\n"

                    msg += "\n*Dados corretos?* (S/N)"
                    await self.api.send_text(state.phone, msg)
                    state.step = 2
                    return False
                else:
                    error_msg = nfce_data.get("error", "Não foi possível extrair dados do cupom.")
                    await self.api.send_text(
                        state.phone,
                        f"⚠️ {error_msg}\n\nVamos preencher manualmente.\n"
                        f"⛽ Quantos *litros*? (ex: 57.32)"
                    )
                    state.data["modo"] = "manual"
                    state.step = 3
                    return False
            else:
                await self.api.send_text(
                    state.phone,
                    "⚠️ Não consegui baixar a imagem. Envie novamente ou digite *manual*."
                )
                return False

        await self.api.send_text(state.phone, "📸 Envie uma *foto* do cupom ou digite *manual*.")
        return False

    async def _step_confirmar_nfce(self, state, msg_type, content):
        """Confirma dados extraídos automaticamente."""
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
            return False
        resp = content.strip().upper()
        if resp in ("S", "SIM"):
            await self.api.send_text(state.phone, "📏 Qual o *KM atual* do veículo?")
            state.step = 5
            return False
        elif resp in ("N", "NAO", "NÃO"):
            await self.api.send_text(
                state.phone,
                "Ok, vamos corrigir manualmente.\n⛽ Quantos *litros*? (ex: 57.32)"
            )
            state.data["modo"] = "manual"
            state.step = 3
            return False
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _step_manual_litros(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite a quantidade de litros.")
            return False
        try:
            litros = float(content.strip().replace(",", "."))
            if litros <= 0:
                await self.api.send_text(state.phone, "⚠️ Litros deve ser maior que zero.")
                return False
            state.data["litros_manual"] = litros
            await self.api.send_text(state.phone, "💰 Valor *total* em R$? (ex: 358.25)")
            state.step = 4
            return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido. Ex: 57.32")
            return False

    async def _step_manual_valor(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o valor total.")
            return False
        try:
            valor = float(content.strip().replace(",", ".").replace("R$", "").strip())
            if valor <= 0:
                await self.api.send_text(state.phone, "⚠️ Valor deve ser maior que zero.")
                return False
            state.data["valor_manual"] = valor
            state.data["preco_litro_manual"] = round(valor / state.data["litros_manual"], 3)
            await self.api.send_text(state.phone, "📏 Qual o *KM atual* do veículo?")
            state.step = 5
            return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido. Ex: 358.25")
            return False

    async def _step_km(self, state, msg_type, content):
        if msg_type != "text":
            await self.api.send_text(state.phone, "⚠️ Digite o KM.")
            return False
        try:
            km = float(content.strip().replace(".", "").replace(",", "."))
            state.data["km_abastecimento"] = km
            # Listar projetos
            result = get_projetos()
            projetos = result.data if result.data else []
            if not projetos:
                state.data["projeto"] = None
                state.step = 7
                await self._show_summary(state)
                return False
            state.data["projetos"] = projetos
            menu = "📋 *Qual projeto?*\n\n"
            for i, p in enumerate(projetos, 1):
                os_label = f" (OS {p['os']})" if p.get("os") else ""
                menu += f"{i}️⃣ {p['nome']}{os_label}\n"
            menu += "\n_Digite o número._"
            await self.api.send_text(state.phone, menu)
            state.step = 6
            return False
        except ValueError:
            await self.api.send_text(state.phone, "⚠️ Valor inválido.")
            return False

    async def _step_projeto(self, state, msg_type, content):
        if msg_type != "text":
            return False
        try:
            idx = int(content.strip()) - 1
            projetos = state.data["projetos"]
            if 0 <= idx < len(projetos):
                state.data["projeto"] = projetos[idx]
                state.step = 7
                await self._show_summary(state)
                return False
        except (ValueError, IndexError):
            pass
        await self.api.send_text(state.phone, "⚠️ Número inválido.")
        return False

    async def _show_summary(self, state):
        veiculo = state.data["veiculo"]
        km = state.data.get("km_abastecimento", 0)
        projeto = state.data.get("projeto")

        if state.data.get("modo") == "auto":
            comb = state.data["nfce"]["combustivel"]
            litros = comb["litros"]
            valor = comb["valor_total"]
            preco = comb["preco_litro"]
        else:
            litros = state.data.get("litros_manual", 0)
            valor = state.data.get("valor_manual", 0)
            preco = state.data.get("preco_litro_manual", 0)

        # Calcular eficiência
        eficiencia = ""
        ultimo = get_ultimo_abastecimento(veiculo["id"])
        if ultimo and ultimo.get("km_atual"):
            km_rodado = km - ultimo["km_atual"]
            if km_rodado > 0 and litros > 0:
                kml = km_rodado / litros
                eficiencia = f"📊 Eficiência: *{kml:.1f} km/l*\n"

        msg = (
            f"📋 *Resumo do Abastecimento*\n\n"
            f"🚗 {veiculo['placa']}\n"
            f"⛽ {litros:.2f}L — R$ {valor:.2f} (R$ {preco:.2f}/L)\n"
            f"📏 KM: {km:,.0f}\n"
            f"📁 Projeto: {projeto['nome'] if projeto else 'Nenhum'}\n"
            f"{eficiencia}\n"
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
            await self.api.send_text(state.phone, "❌ Abastecimento cancelado.")
            return True
        await self.api.send_text(state.phone, "⚠️ Digite *S* ou *N*.")
        return False

    async def _salvar(self, state):
        try:
            veiculo = state.data["veiculo"]
            projeto = state.data.get("projeto")
            km = state.data.get("km_abastecimento", 0)

            if state.data.get("modo") == "auto":
                nfce = state.data["nfce"]
                comb = nfce["combustivel"]
                emit = nfce.get("emitente", {})
                pag = nfce.get("pagamento", {})

                # Calcular km_por_litro
                km_por_litro = None
                ultimo = get_ultimo_abastecimento(veiculo["id"])
                if ultimo and ultimo.get("km_atual") and km > 0:
                    km_rodado = km - ultimo["km_atual"]
                    if km_rodado > 0 and comb["litros"] > 0:
                        km_por_litro = round(km_rodado / comb["litros"], 2)

                registro = {
                    "veiculo_id": veiculo["id"],
                    "colaborador_id": state.collaborator["id"],
                    "data_abastecimento": nfce.get("data_emissao") or None,
                    "litros": comb["litros"],
                    "valor_total": comb["valor_total"],
                    "preco_litro": comb["preco_litro"],
                    "km_por_litro": km_por_litro,
                    "tipo_combustivel": comb.get("tipo", ""),
                    "km_atual": km,
                    "posto_nome": emit.get("nome", ""),
                    "posto_cnpj": emit.get("cnpj", ""),
                    "posto_cidade": emit.get("endereco", ""),
                    "chave_nfce": nfce.get("chave_nfce", ""),
                    "forma_pagamento": pag.get("forma", ""),
                    "ultimos_digitos_cartao": pag.get("ultimos_digitos", ""),
                    "projeto_id": projeto["id"] if projeto else None,
                }
            else:
                litros = state.data.get("litros_manual", 0)
                valor = state.data.get("valor_manual", 0)
                preco = state.data.get("preco_litro_manual", 0)

                # Calcular km_por_litro
                km_por_litro = None
                ultimo = get_ultimo_abastecimento(veiculo["id"])
                if ultimo and ultimo.get("km_atual") and km > 0:
                    km_rodado = km - ultimo["km_atual"]
                    if km_rodado > 0 and litros > 0:
                        km_por_litro = round(km_rodado / litros, 2)

                registro = {
                    "veiculo_id": veiculo["id"],
                    "colaborador_id": state.collaborator["id"],
                    "litros": litros,
                    "valor_total": valor,
                    "preco_litro": preco,
                    "km_por_litro": km_por_litro,
                    "km_atual": km,
                    "projeto_id": projeto["id"] if projeto else None,
                }

            insert_abastecimento(registro)
            update_veiculo_km(veiculo["id"], km)

            await self.api.send_text(
                state.phone,
                f"✅ *Abastecimento registrado!*\n"
                f"🚗 {veiculo['placa']} — {km:,.0f} km"
            )
        except Exception as e:
            logger.error(f"Erro ao salvar abastecimento: {e}", exc_info=True)
            await self.api.send_text(state.phone, "❌ Erro ao salvar. Tente novamente.")
