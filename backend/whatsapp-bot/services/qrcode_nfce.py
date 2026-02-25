"""
Serviço de leitura de QR Code de NFC-e.
1. Recebe imagem (base64 ou path)
2. Detecta QR Code com pyzbar
3. Extrai URL da SEFAZ
4. Consulta SEFAZ via HTTP GET
5. Parseia HTML com BeautifulSoup
6. Retorna JSON estruturado
"""

import base64
import io
import re
import logging
import requests
from PIL import Image
from pyzbar.pyzbar import decode
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def extract_nfce_from_base64(image_base64: str) -> dict:
    """Recebe imagem em base64, retorna dados da NFC-e."""
    try:
        # Remover header se presente (data:image/jpeg;base64,...)
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        return _process_image(image)
    except Exception as e:
        logger.error(f"Erro ao processar base64: {e}")
        return {"error": f"Erro ao processar imagem: {str(e)}"}


def extract_nfce_from_path(image_path: str) -> dict:
    """Recebe path da imagem, retorna dados da NFC-e."""
    try:
        image = Image.open(image_path)
        return _process_image(image)
    except Exception as e:
        logger.error(f"Erro ao abrir imagem: {e}")
        return {"error": f"Erro ao abrir imagem: {str(e)}"}


def _process_image(image: Image.Image) -> dict:
    """Pipeline: QR Code -> URL -> SEFAZ -> Parse."""

    # 1. Detectar QR Code
    decoded = decode(image)
    if not decoded:
        return {"error": "QR Code não encontrado na imagem. Tente uma foto mais nítida."}

    url = decoded[0].data.decode("utf-8")
    logger.info(f"QR Code detectado. URL: {url[:80]}...")

    # Validar que é uma URL de NFC-e
    if "nfce" not in url.lower() and "fazenda" not in url.lower():
        return {"error": "QR Code não parece ser de uma NFC-e (cupom fiscal)."}

    # 2. Consultar SEFAZ
    try:
        response = requests.get(url, timeout=15, verify=True)
        if response.status_code != 200:
            return {"error": f"SEFAZ retornou status {response.status_code}"}
    except requests.Timeout:
        return {"error": "Timeout ao consultar SEFAZ. Tente novamente."}
    except Exception as e:
        return {"error": f"Erro ao consultar SEFAZ: {str(e)}"}

    # 3. Parsear HTML
    return _parse_sefaz_html(response.text, url)


def _parse_sefaz_html(html: str, url: str) -> dict:
    """Extrai dados estruturados do HTML da SEFAZ."""
    soup = BeautifulSoup(html, "html.parser")

    result = {
        "url_sefaz": url,
        "chave_nfce": _extract_chave(url, soup),
        "emitente": _extract_emitente(soup),
        "itens": _extract_itens(soup),
        "total": _extract_total(soup),
        "pagamento": _extract_pagamento(soup),
        "data_emissao": _extract_data_emissao(soup),
        "combustivel": None,
        "tributos": _extract_tributos(soup),
    }

    # Identificar item de combustível (unidade = L)
    for item in result["itens"]:
        if item.get("unidade", "").upper() == "L" and item.get("quantidade", 0) > 1:
            result["combustivel"] = {
                "tipo": item["descricao"],
                "litros": item["quantidade"],
                "preco_litro": item["valor_unitario"],
                "valor_total": item["valor_total"],
            }
            # Tentar extrair dados da bomba (encerrantes)
            encerrantes = _extract_encerrantes(soup)
            if encerrantes:
                result["combustivel"].update(encerrantes)
            break

    return result


def _extract_chave(url: str, soup) -> str:
    """Extrai chave de acesso (44 dígitos)."""
    # Tentar extrair da URL
    match = re.search(r"p=(\d{44})", url)
    if match:
        return match.group(1)

    # Tentar extrair do HTML
    chave_el = soup.find(string=re.compile(r"\d{4}\s?\d{4}\s?\d{4}"))
    if chave_el:
        return re.sub(r"\s", "", chave_el.strip())[:44]

    return ""


def _extract_emitente(soup) -> dict:
    """Extrai dados do emitente (estabelecimento)."""
    emitente = {"nome": "", "cnpj": "", "endereco": ""}

    # Padrão: div com classe "txtTopo" ou similar
    nome_el = soup.find("div", class_="txtTopo")
    if nome_el:
        emitente["nome"] = nome_el.get_text(strip=True)

    # CNPJ: procurar padrão XX.XXX.XXX/XXXX-XX
    cnpj_match = re.search(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}", soup.get_text())
    if cnpj_match:
        emitente["cnpj"] = cnpj_match.group()

    # Endereço: geralmente após CNPJ
    endereco_el = soup.find("div", class_="txtTopo", string=re.compile(r"(Rua|Rod|Av|BR|PR|SP)"))
    if endereco_el:
        emitente["endereco"] = endereco_el.get_text(strip=True)

    return emitente


def _extract_itens(soup) -> list:
    """Extrai lista de itens da nota."""
    itens = []

    # Padrão comum: tabela com id "tabResult" ou classe "table"
    rows = soup.select("tr.txtTit, tr.txtTit2, #tabResult tr")
    if not rows:
        rows = soup.find_all("tr")

    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 3:
            try:
                desc = cols[0].get_text(strip=True) if cols[0] else ""
                qtd_text = cols[1].get_text(strip=True) if cols[1] else "0"
                un = cols[2].get_text(strip=True) if cols[2] else ""
                vl_unit = cols[3].get_text(strip=True) if len(cols) > 3 else "0"
                vl_total = cols[4].get_text(strip=True) if len(cols) > 4 else "0"

                # Limpar números
                qtd = _parse_number(qtd_text)
                vl_u = _parse_number(vl_unit)
                vl_t = _parse_number(vl_total)

                if desc and qtd > 0:
                    itens.append({
                        "descricao": desc,
                        "quantidade": qtd,
                        "unidade": un,
                        "valor_unitario": vl_u,
                        "valor_total": vl_t,
                    })
            except (ValueError, IndexError):
                continue

    return itens


def _extract_total(soup) -> float:
    """Extrai valor total da nota."""
    total_el = soup.find(string=re.compile(r"Valor total", re.I))
    if total_el:
        parent = total_el.find_parent()
        if parent:
            number = re.search(r"[\d.,]+", parent.get_text())
            if number:
                return _parse_number(number.group())
    return 0.0


def _extract_pagamento(soup) -> dict:
    """Extrai forma de pagamento."""
    pagamento = {"forma": "", "bandeira": "", "ultimos_digitos": "", "valor": 0.0}

    pag_text = soup.get_text()

    if "Crédito" in pag_text:
        pagamento["forma"] = "Cartão de Crédito"
    elif "Débito" in pag_text:
        pagamento["forma"] = "Cartão de Débito"
    elif "Dinheiro" in pag_text:
        pagamento["forma"] = "Dinheiro"
    elif "PIX" in pag_text or "Pix" in pag_text:
        pagamento["forma"] = "PIX"

    # Bandeira
    for bandeira in ["Visa", "Master", "Elo", "Amex", "Hiper"]:
        if bandeira.lower() in pag_text.lower():
            pagamento["bandeira"] = bandeira
            break

    # Últimos dígitos
    digits_match = re.search(r"final\s*(\d{1,4})", pag_text, re.I)
    if digits_match:
        pagamento["ultimos_digitos"] = digits_match.group(1)

    return pagamento


def _extract_data_emissao(soup) -> str:
    """Extrai data de emissão."""
    date_match = re.search(r"\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}", soup.get_text())
    if date_match:
        return date_match.group()
    return ""


def _extract_tributos(soup) -> dict:
    """Extrai informações de tributos."""
    tributos = {"federal": 0.0, "estadual": 0.0, "municipal": 0.0}

    trib_text = soup.get_text()
    fed_match = re.search(r"Federal[:\s]*R?\$?\s*([\d.,]+)", trib_text, re.I)
    est_match = re.search(r"Estadual[:\s]*R?\$?\s*([\d.,]+)", trib_text, re.I)
    mun_match = re.search(r"Municipal[:\s]*R?\$?\s*([\d.,]+)", trib_text, re.I)

    if fed_match:
        tributos["federal"] = _parse_number(fed_match.group(1))
    if est_match:
        tributos["estadual"] = _parse_number(est_match.group(1))
    if mun_match:
        tributos["municipal"] = _parse_number(mun_match.group(1))

    return tributos


def _extract_encerrantes(soup) -> dict:
    """Extrai dados de encerrantes da bomba (campo de informações adicionais)."""
    info_text = soup.get_text()
    result = {}

    enc_ini = re.search(r"[Ee]nc[.:]?\s*[Ii]ni[.:]?\s*([\d.,]+)", info_text)
    enc_fin = re.search(r"[Ee]nc[.:]?\s*[Ff]in[.:]?\s*([\d.,]+)", info_text)
    bico = re.search(r"[Bb]ico[.:]?\s*(\d+)", info_text)
    bomba = re.search(r"[Bb]omba[.:]?\s*(\d+)", info_text)

    if enc_ini:
        result["encerrante_inicial"] = _parse_number(enc_ini.group(1))
    if enc_fin:
        result["encerrante_final"] = _parse_number(enc_fin.group(1))
    if bico:
        result["bico"] = int(bico.group(1))
    if bomba:
        result["bomba"] = int(bomba.group(1))

    return result


def _parse_number(text: str) -> float:
    """Converte texto numérico BR para float (1.234,56 -> 1234.56)."""
    cleaned = text.replace("R$", "").replace(" ", "").strip()
    # Se tem vírgula como decimal
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
