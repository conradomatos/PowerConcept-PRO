"""Cliente Supabase usando service_role key (bypass RLS)."""

from supabase import create_client, Client
from config import settings

_client: Client = None


def init_supabase():
    global _client
    _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_client() -> Client:
    if _client is None:
        init_supabase()
    return _client


# === Helpers para tabelas de Frotas ===

def get_veiculos():
    """Lista veículos ativos para exibir no menu."""
    return get_client().table("veiculos").select(
        "id, placa, apelido, modelo, km_atual"
    ).eq("status", "ativo").order("placa").execute()


def get_projetos():
    """Lista projetos ativos para exibir no menu."""
    return get_client().table("projetos").select(
        "id, nome, os"
    ).eq("status", "ativo").order("nome").execute()


def get_collaborator_by_phone(phone: str):
    """Busca colaborador pelo número de WhatsApp."""
    return get_client().table("collaborators").select("*").eq(
        "whatsapp_number", phone
    ).single().execute()


def insert_registro_km(data: dict):
    return get_client().table("registros_km").insert(data).execute()


def insert_abastecimento(data: dict):
    return get_client().table("abastecimentos").insert(data).execute()


def insert_despesa(data: dict):
    return get_client().table("despesas_deslocamento").insert(data).execute()


def update_veiculo_km(veiculo_id: str, km_atual: float):
    return get_client().table("veiculos").update(
        {"km_atual": km_atual}
    ).eq("id", veiculo_id).execute()


def get_ultimo_km(veiculo_id: str):
    """Retorna o último registro de KM do veículo."""
    result = get_client().table("registros_km") \
        .select("km_registrado, tipo, created_at") \
        .eq("veiculo_id", veiculo_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


def get_ultimo_abastecimento(veiculo_id: str):
    """Retorna o último abastecimento para cálculo de eficiência."""
    result = get_client().table("abastecimentos") \
        .select("km_atual, litros") \
        .eq("veiculo_id", veiculo_id) \
        .order("data_abastecimento", desc=True) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


def insert_apontamento_dia(data: dict):
    """Cria um apontamento_dia e retorna o registro."""
    return get_client().table("apontamento_dia").insert(data).select("id").single().execute()


def insert_apontamento_item(data: dict):
    return get_client().table("apontamento_item").insert(data).execute()


def upload_comprovante(bucket: str, path: str, file_bytes: bytes, content_type: str = "image/jpeg"):
    """Faz upload de arquivo para Supabase Storage."""
    return get_client().storage.from_(bucket).upload(
        path, file_bytes, {"content-type": content_type}
    )


def get_public_url(bucket: str, path: str) -> str:
    """Retorna URL pública de um arquivo no Storage."""
    return get_client().storage.from_(bucket).get_public_url(path)
