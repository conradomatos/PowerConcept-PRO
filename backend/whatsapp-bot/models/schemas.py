"""Pydantic models para validação de dados."""

from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class RegistroKM(BaseModel):
    veiculo_id: str
    colaborador_id: str
    tipo: str  # "saida" | "volta"
    km_registrado: float
    km_calculado: Optional[float] = None
    data_registro: str
    projeto_id: Optional[str] = None
    foto_odometro_url: Optional[str] = None


class Abastecimento(BaseModel):
    veiculo_id: str
    colaborador_id: str
    litros: Optional[float] = None
    valor_total: Optional[float] = None
    preco_litro: Optional[float] = None
    km_por_litro: Optional[float] = None
    km_atual: Optional[float] = None
    tipo_combustivel: Optional[str] = None
    posto_nome: Optional[str] = None
    posto_cnpj: Optional[str] = None
    posto_cidade: Optional[str] = None
    chave_nfce: Optional[str] = None
    forma_pagamento: Optional[str] = None
    ultimos_digitos_cartao: Optional[str] = None
    foto_cupom_url: Optional[str] = None
    data_abastecimento: Optional[str] = None
    projeto_id: Optional[str] = None


class DespesaDeslocamento(BaseModel):
    veiculo_id: Optional[str] = None
    colaborador_id: str
    projeto_id: Optional[str] = None
    tipo: str  # "pedagio" | "estacionamento" | "lavagem" | "outro"
    valor: float
    descricao: Optional[str] = None
    comprovante_url: Optional[str] = None
    data_despesa: str


class ApontamentoDia(BaseModel):
    colaborador_id: str
    data: str
    status: str = "RASCUNHO"
    created_by: Optional[str] = None


class ApontamentoItem(BaseModel):
    apontamento_dia_id: str
    projeto_id: str
    horas: float
    descricao: Optional[str] = None
    tipo_hora: str = "NORMAL"
    is_overhead: bool = False
    created_by: Optional[str] = None


class NfceData(BaseModel):
    url_sefaz: str = ""
    chave_nfce: str = ""
    emitente: dict = {}
    itens: list = []
    total: float = 0.0
    pagamento: dict = {}
    data_emissao: str = ""
    combustivel: Optional[dict] = None
    tributos: dict = {}


class WebhookEvent(BaseModel):
    event: str
    instance: Optional[str] = None
    data: Optional[dict] = None
