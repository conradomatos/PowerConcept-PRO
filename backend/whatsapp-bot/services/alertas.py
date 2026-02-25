"""
Sistema de alertas proativos — roda em background via APScheduler.
Verifica condições e envia mensagens via WhatsApp.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.supabase_client import get_client
from services.evolution_api import EvolutionAPI

logger = logging.getLogger(__name__)


class AlertScheduler:
    def __init__(self, evolution_api: EvolutionAPI):
        self.api = evolution_api
        self.scheduler = AsyncIOScheduler()

    def start(self):
        # Verificar manutenções a cada 6 horas
        self.scheduler.add_job(
            self.check_manutencao,
            "interval",
            hours=6,
            id="check_manutencao",
        )
        # Resumo semanal toda segunda às 8h
        self.scheduler.add_job(
            self.enviar_resumo_semanal,
            "cron",
            day_of_week="mon",
            hour=8,
            minute=0,
            id="resumo_semanal",
        )
        self.scheduler.start()
        logger.info("AlertScheduler iniciado.")

    def stop(self):
        self.scheduler.shutdown()

    async def check_manutencao(self):
        """Verifica veículos com manutenção próxima ou vencida."""
        try:
            client = get_client()

            # Buscar manutenções pendentes com dados do veículo
            result = client.table("manutencoes") \
                .select("id, tipo, status, km_previsto, veiculos:veiculo_id (placa, apelido, km_atual)") \
                .in_("status", ["atencao", "vencida", "critica"]) \
                .execute()

            if not result.data:
                return

            # Buscar colaboradores com WhatsApp para notificar
            gestores = client.table("collaborators") \
                .select("whatsapp_number") \
                .not_.is_("whatsapp_number", "null") \
                .execute()

            gestor_phones = [
                g["whatsapp_number"]
                for g in (gestores.data or [])
                if g.get("whatsapp_number")
            ]

            if not gestor_phones:
                logger.warning("Nenhum gestor com WhatsApp cadastrado para receber alertas.")
                return

            for manut in result.data:
                veiculo = manut.get("veiculos") or {}
                km_atual = veiculo.get("km_atual", 0) or 0
                km_previsto = manut.get("km_previsto", 0) or 0
                status = manut.get("status", "")
                tipo = manut.get("tipo", "Manutenção")
                placa = veiculo.get("placa", "?")
                apelido = veiculo.get("apelido", "")

                if status == "critica":
                    msg = (
                        f"🔴 *MANUTENÇÃO CRÍTICA*\n\n"
                        f"🚗 {placa} ({apelido})\n"
                        f"🔧 {tipo}\n"
                        f"⚠️ Ação imediata necessária!\n"
                        f"Previsto: {km_previsto:,.0f} km | Atual: {km_atual:,.0f} km"
                    )
                elif status == "vencida":
                    msg = (
                        f"🟠 *Manutenção Vencida*\n\n"
                        f"🚗 {placa} ({apelido})\n"
                        f"🔧 {tipo}\n"
                        f"Previsto: {km_previsto:,.0f} km | Atual: {km_atual:,.0f} km"
                    )
                elif status == "atencao":
                    diff = km_previsto - km_atual if km_previsto > 0 else 0
                    msg = (
                        f"🟡 *Manutenção Próxima*\n\n"
                        f"🚗 {placa} ({apelido})\n"
                        f"🔧 {tipo}\n"
                        f"Faltam *{diff:,.0f} km* para manutenção"
                    )
                else:
                    continue

                for phone in gestor_phones:
                    await self.api.send_text(phone, msg)

        except Exception as e:
            logger.error(f"Erro ao verificar manutenções: {e}", exc_info=True)

    async def enviar_resumo_semanal(self):
        """Envia resumo semanal para gestores."""
        try:
            client = get_client()

            # Buscar colaboradores com WhatsApp
            gestores = client.table("collaborators") \
                .select("whatsapp_number") \
                .not_.is_("whatsapp_number", "null") \
                .execute()

            gestor_phones = [
                g["whatsapp_number"]
                for g in (gestores.data or [])
                if g.get("whatsapp_number")
            ]

            if not gestor_phones:
                return

            # Contagens da semana
            from datetime import datetime, timedelta
            hoje = datetime.utcnow().date()
            inicio_semana = (hoje - timedelta(days=7)).isoformat()
            fim_semana = hoje.isoformat()

            km_result = client.table("registros_km") \
                .select("id", count="exact") \
                .gte("data_registro", inicio_semana) \
                .lte("data_registro", fim_semana) \
                .execute()

            abast_result = client.table("abastecimentos") \
                .select("id", count="exact") \
                .gte("data_abastecimento", inicio_semana) \
                .lte("data_abastecimento", fim_semana + "T23:59:59") \
                .execute()

            manut_pendentes = client.table("manutencoes") \
                .select("id", count="exact") \
                .in_("status", ["atencao", "vencida", "critica"]) \
                .execute()

            msg = (
                f"📊 *Resumo Semanal — Frotas*\n\n"
                f"📏 Registros de KM: {km_result.count or 0}\n"
                f"⛽ Abastecimentos: {abast_result.count or 0}\n"
                f"🔧 Manutenções pendentes: {manut_pendentes.count or 0}\n\n"
                f"_Semana de {inicio_semana} a {fim_semana}_"
            )

            for phone in gestor_phones:
                await self.api.send_text(phone, msg)

            logger.info("Resumo semanal enviado.")
        except Exception as e:
            logger.error(f"Erro no resumo semanal: {e}", exc_info=True)
