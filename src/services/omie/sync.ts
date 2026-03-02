import { supabase } from "@/integrations/supabase/client";

interface SyncResult {
  success: boolean;
  message?: string;
}

interface OmieProjectPayload {
  call: string;
  param: {
    codInt: string;
    nome: string;
    inativo: string;
  };
  meta: {
    entity: string;
    entity_id: string;
    action: string;
  };
}

interface OmieResponse {
  ok: boolean;
  data?: {
    codigo?: number;
    descricao?: string;
  };
  error?: string;
  message?: string;
}

/**
 * Calls the omie-projetos Edge Function
 */
async function callOmieProjectsFunction(
  call: string,
  param: { codInt: string; nome: string; inativo: string },
  meta: { entity: string; entity_id: string; action: string }
): Promise<OmieResponse> {
  const payload: OmieProjectPayload = { call, param, meta };

  const { data, error } = await supabase.functions.invoke('omie-projetos', {
    body: payload,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Erro ao chamar função de sincronização",
    };
  }

  return data as OmieResponse;
}

/**
 * Syncs a project to Omie
 * @param projectId - The UUID of the project to sync
 * @returns SyncResult with success status and message
 */
export async function syncProjectToOmie(projectId: string): Promise<SyncResult> {
  try {
    // 1. Fetch the project with empresa data
    const { data: project, error: fetchError } = await supabase
      .from('projetos')
      .select('id, os, nome, empresa_id, empresas(codigo)')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      return {
        success: false,
        message: "Projeto não encontrado",
      };
    }

    // 2. Validate required fields
    if (!project.os) {
      return {
        success: false,
        message: "Projeto não possui OS definida. Aprove o projeto primeiro.",
      };
    }

    if (!project.nome || project.nome.trim() === '') {
      return {
        success: false,
        message: "Projeto não possui nome definido.",
      };
    }

    // Get empresa codigo (client abbreviation)
    const empresaData = project.empresas as { codigo: string } | null;
    if (!empresaData?.codigo) {
      return {
        success: false,
        message: "Projeto não possui cliente vinculado com código.",
      };
    }

    // 3. Format name as: OS / NOME DO PROJETO / ABREVIACAO CLIENTE
    const nomeOmie = `${project.os} / ${project.nome.toUpperCase()} / ${empresaData.codigo}`;

    // 4. Call the Edge Function
    const response = await callOmieProjectsFunction(
      'UpsertProjeto',
      {
        codInt: project.os,
        nome: nomeOmie,
        inativo: 'N',
      },
      {
        entity: 'project',
        entity_id: projectId,
        action: 'UPSERT_PROJETO',
      }
    );

    // 4. Update the project in the database based on the response
    if (response.ok) {
      const updateData: Record<string, unknown> = {
        omie_codint: project.os,
        omie_sync_status: 'SYNCED',
        omie_last_sync_at: new Date().toISOString(),
        omie_last_error: null,
      };

      // Save omie_codigo if returned
      if (response.data?.codigo) {
        updateData.omie_codigo = response.data.codigo;
      }

      const { error: updateError } = await supabase
        .from('projetos')
        .update(updateData)
        .eq('id', projectId);

      if (updateError) {
        // Still return success since Omie sync worked
      }

      return {
        success: true,
        message: response.message || "Projeto sincronizado com Omie",
      };
    } else {
      // Error from Omie
      const errorMessage = response.error || "Erro desconhecido do Omie";

      const { error: updateError } = await supabase
        .from('projetos')
        .update({
          omie_sync_status: 'ERROR',
          omie_last_error: errorMessage,
        })
        .eq('id', projectId);

      if (updateError) {
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error) {
    
    // Try to update error status
    try {
      await supabase
        .from('projetos')
        .update({
          omie_sync_status: 'ERROR',
          omie_last_error: error instanceof Error ? error.message : 'Erro inesperado',
        })
        .eq('id', projectId);
    } catch (updateError) {
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro inesperado ao sincronizar",
    };
  }
}
