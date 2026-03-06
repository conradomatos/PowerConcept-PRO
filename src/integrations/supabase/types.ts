export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          chave_nfce: string | null
          colaborador_id: string | null
          conciliado_omie: boolean | null
          created_at: string
          dados_nfce_json: Json | null
          data_abastecimento: string | null
          encerrante_final: number | null
          encerrante_inicial: number | null
          forma_pagamento: string | null
          foto_cupom_url: string | null
          id: string
          km_atual: number | null
          km_por_litro: number | null
          litros: number | null
          omie_lancamento_id: string | null
          posto_cidade: string | null
          posto_cnpj: string | null
          posto_nome: string | null
          preco_litro: number | null
          projeto_id: string | null
          tipo_combustivel: string | null
          ultimos_digitos_cartao: string | null
          updated_at: string
          valor_total: number | null
          veiculo_id: string
        }
        Insert: {
          chave_nfce?: string | null
          colaborador_id?: string | null
          conciliado_omie?: boolean | null
          created_at?: string
          dados_nfce_json?: Json | null
          data_abastecimento?: string | null
          encerrante_final?: number | null
          encerrante_inicial?: number | null
          forma_pagamento?: string | null
          foto_cupom_url?: string | null
          id?: string
          km_atual?: number | null
          km_por_litro?: number | null
          litros?: number | null
          omie_lancamento_id?: string | null
          posto_cidade?: string | null
          posto_cnpj?: string | null
          posto_nome?: string | null
          preco_litro?: number | null
          projeto_id?: string | null
          tipo_combustivel?: string | null
          ultimos_digitos_cartao?: string | null
          updated_at?: string
          valor_total?: number | null
          veiculo_id: string
        }
        Update: {
          chave_nfce?: string | null
          colaborador_id?: string | null
          conciliado_omie?: boolean | null
          created_at?: string
          dados_nfce_json?: Json | null
          data_abastecimento?: string | null
          encerrante_final?: number | null
          encerrante_inicial?: number | null
          forma_pagamento?: string | null
          foto_cupom_url?: string | null
          id?: string
          km_atual?: number | null
          km_por_litro?: number | null
          litros?: number | null
          omie_lancamento_id?: string | null
          posto_cidade?: string | null
          posto_cnpj?: string | null
          posto_nome?: string | null
          preco_litro?: number | null
          projeto_id?: string | null
          tipo_combustivel?: string | null
          ultimos_digitos_cartao?: string | null
          updated_at?: string
          valor_total?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "abastecimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          debate_posture: string | null
          description: string | null
          example_responses: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          knowledge_base: string | null
          max_response_length: string | null
          max_tokens: number | null
          model: string | null
          name: string
          priority_order: number | null
          slug: string
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          debate_posture?: string | null
          description?: string | null
          example_responses?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          max_response_length?: string | null
          max_tokens?: number | null
          model?: string | null
          name: string
          priority_order?: number | null
          slug: string
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          debate_posture?: string | null
          description?: string | null
          example_responses?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          max_response_length?: string | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          priority_order?: number | null
          slug?: string
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          agent_color: string | null
          agent_id: string | null
          agent_name: string | null
          agent_type: string | null
          content: string
          created_at: string | null
          id: string
          is_favorited: boolean | null
          metadata: Json | null
          role: string
          thread_id: string
        }
        Insert: {
          agent_color?: string | null
          agent_id?: string | null
          agent_name?: string | null
          agent_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_favorited?: boolean | null
          metadata?: Json | null
          role: string
          thread_id: string
        }
        Update: {
          agent_color?: string | null
          agent_id?: string | null
          agent_name?: string | null
          agent_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_favorited?: boolean | null
          metadata?: Json | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          agent_type: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_favorite: boolean | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          agent_type?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          agent_type?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          default_agent: string | null
          id: string
          is_connected: boolean | null
          last_connection_test: string | null
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          default_agent?: string | null
          id?: string
          is_connected?: boolean | null
          last_connection_test?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          default_agent?: string | null
          id?: string
          is_connected?: boolean | null
          last_connection_test?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_threads: {
        Row: {
          active_agents: string[] | null
          agent_type: string | null
          created_at: string | null
          description: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          project_id: string | null
          status: string | null
          thread_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_agents?: string[] | null
          agent_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          project_id?: string | null
          status?: string | null
          thread_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_agents?: string[] | null
          agent_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          project_id?: string | null
          status?: string | null
          thread_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "ai_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      alocacoes_blocos: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          observacao: string | null
          prioridade: number | null
          projeto_id: string
          tipo: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          observacao?: string | null
          prioridade?: number | null
          projeto_id: string
          tipo?: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          observacao?: string | null
          prioridade?: number | null
          projeto_id?: string
          tipo?: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_blocos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      alocacoes_blocos_rateio: {
        Row: {
          alocacao_bloco_id: string
          created_at: string
          horas_dia: number | null
          id: string
          percentual: number | null
          projeto_id: string
          updated_at: string
        }
        Insert: {
          alocacao_bloco_id: string
          created_at?: string
          horas_dia?: number | null
          id?: string
          percentual?: number | null
          projeto_id: string
          updated_at?: string
        }
        Update: {
          alocacao_bloco_id?: string
          created_at?: string
          horas_dia?: number | null
          id?: string
          percentual?: number | null
          projeto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_blocos_rateio_alocacao_bloco_id_fkey"
            columns: ["alocacao_bloco_id"]
            isOneToOne: false
            referencedRelation: "alocacoes_blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      alocacoes_padrao: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          observacao: string | null
          projeto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          observacao?: string | null
          projeto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          observacao?: string | null
          projeto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_padrao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      alocacoes_padrao_rateio: {
        Row: {
          alocacao_padrao_id: string
          created_at: string
          horas_dia: number | null
          id: string
          percentual: number | null
          projeto_id: string
          updated_at: string
        }
        Insert: {
          alocacao_padrao_id: string
          created_at?: string
          horas_dia?: number | null
          id?: string
          percentual?: number | null
          projeto_id: string
          updated_at?: string
        }
        Update: {
          alocacao_padrao_id?: string
          created_at?: string
          horas_dia?: number | null
          id?: string
          percentual?: number | null
          projeto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_padrao_rateio_alocacao_padrao_id_fkey"
            columns: ["alocacao_padrao_id"]
            isOneToOne: false
            referencedRelation: "alocacoes_padrao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_rateio_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      apontamento_dia: {
        Row: {
          aprovado_at: string | null
          aprovado_by: string | null
          bloqueado_at: string | null
          bloqueado_by: string | null
          colaborador_id: string
          created_at: string
          created_by: string | null
          data: string
          enviado_at: string | null
          enviado_by: string | null
          fonte_base:
            | Database["public"]["Enums"]["apontamento_fonte_base"]
            | null
          horas_base_dia: number | null
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["apontamento_dia_status"]
          total_horas_apontadas: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aprovado_at?: string | null
          aprovado_by?: string | null
          bloqueado_at?: string | null
          bloqueado_by?: string | null
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data: string
          enviado_at?: string | null
          enviado_by?: string | null
          fonte_base?:
            | Database["public"]["Enums"]["apontamento_fonte_base"]
            | null
          horas_base_dia?: number | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["apontamento_dia_status"]
          total_horas_apontadas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aprovado_at?: string | null
          aprovado_by?: string | null
          bloqueado_at?: string | null
          bloqueado_by?: string | null
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          enviado_at?: string | null
          enviado_by?: string | null
          fonte_base?:
            | Database["public"]["Enums"]["apontamento_fonte_base"]
            | null
          horas_base_dia?: number | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["apontamento_dia_status"]
          total_horas_apontadas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamento_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamento_item: {
        Row: {
          apontamento_dia_id: string
          atividade_id: string | null
          centro_custo_id: string | null
          created_at: string
          created_by: string | null
          custo_hora: number | null
          custo_total: number | null
          descricao: string | null
          horas: number
          id: string
          is_overhead: boolean
          projeto_id: string
          tipo_hora: Database["public"]["Enums"]["tipo_hora_ext"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apontamento_dia_id: string
          atividade_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_hora?: number | null
          custo_total?: number | null
          descricao?: string | null
          horas?: number
          id?: string
          is_overhead?: boolean
          projeto_id: string
          tipo_hora?: Database["public"]["Enums"]["tipo_hora_ext"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apontamento_dia_id?: string
          atividade_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_hora?: number | null
          custo_total?: number | null
          descricao?: string | null
          horas?: number
          id?: string
          is_overhead?: boolean
          projeto_id?: string
          tipo_hora?: Database["public"]["Enums"]["tipo_hora_ext"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamento_item_apontamento_dia_id_fkey"
            columns: ["apontamento_dia_id"]
            isOneToOne: false
            referencedRelation: "apontamento_dia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      apontamentos_consolidado: {
        Row: {
          arquivo_importacao_id: string | null
          centro_custo: string | null
          cpf: string
          created_at: string
          data_apontamento: string
          data_atualizacao_gantt: string | null
          data_importacao: string | null
          descricao: string | null
          funcionario_id: string | null
          gantt_atualizado: boolean
          horas: number
          id: string
          linha_arquivo: number | null
          motivo_erro: string | null
          nome_funcionario: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"]
          os_numero: string | null
          projeto_id: string | null
          projeto_nome: string | null
          status_apontamento: Database["public"]["Enums"]["apontamento_status"]
          status_integracao: Database["public"]["Enums"]["integracao_status"]
          tarefa_id: string | null
          tarefa_nome: string | null
          tipo_hora: Database["public"]["Enums"]["tipo_hora"]
          updated_at: string
          usuario_lancamento: string | null
        }
        Insert: {
          arquivo_importacao_id?: string | null
          centro_custo?: string | null
          cpf: string
          created_at?: string
          data_apontamento: string
          data_atualizacao_gantt?: string | null
          data_importacao?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          gantt_atualizado?: boolean
          horas?: number
          id?: string
          linha_arquivo?: number | null
          motivo_erro?: string | null
          nome_funcionario?: string | null
          observacao?: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"]
          os_numero?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status_apontamento?: Database["public"]["Enums"]["apontamento_status"]
          status_integracao?: Database["public"]["Enums"]["integracao_status"]
          tarefa_id?: string | null
          tarefa_nome?: string | null
          tipo_hora?: Database["public"]["Enums"]["tipo_hora"]
          updated_at?: string
          usuario_lancamento?: string | null
        }
        Update: {
          arquivo_importacao_id?: string | null
          centro_custo?: string | null
          cpf?: string
          created_at?: string
          data_apontamento?: string
          data_atualizacao_gantt?: string | null
          data_importacao?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          gantt_atualizado?: boolean
          horas?: number
          id?: string
          linha_arquivo?: number | null
          motivo_erro?: string | null
          nome_funcionario?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["apontamento_origem"]
          os_numero?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status_apontamento?: Database["public"]["Enums"]["apontamento_status"]
          status_integracao?: Database["public"]["Enums"]["integracao_status"]
          tarefa_id?: string | null
          tarefa_nome?: string | null
          tipo_hora?: Database["public"]["Enums"]["tipo_hora"]
          updated_at?: string
          usuario_lancamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_consolidado_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      apontamentos_horas_dia: {
        Row: {
          colaborador_id: string
          cpf: string
          created_at: string
          data: string
          falta_horas: number
          fonte: string
          horas_100: number
          horas_50: number
          horas_normais: number
          horas_noturnas: number
          id: string
          os: string | null
          projeto_id: string | null
          updated_at: string
          warning_sem_custo: boolean
        }
        Insert: {
          colaborador_id: string
          cpf: string
          created_at?: string
          data: string
          falta_horas?: number
          fonte?: string
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          os?: string | null
          projeto_id?: string | null
          updated_at?: string
          warning_sem_custo?: boolean
        }
        Update: {
          colaborador_id?: string
          cpf?: string
          created_at?: string
          data?: string
          falta_horas?: number
          fonte?: string
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          os?: string | null
          projeto_id?: string | null
          updated_at?: string
          warning_sem_custo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_horas_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      arquivos_importacao: {
        Row: {
          created_at: string
          id: string
          linhas_erro: number
          linhas_sucesso: number
          nome_arquivo: string
          resumo_json: Json | null
          tipo: string | null
          tipo_arquivo: string
          total_linhas: number
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          linhas_erro?: number
          linhas_sucesso?: number
          nome_arquivo: string
          resumo_json?: Json | null
          tipo?: string | null
          tipo_arquivo: string
          total_linhas?: number
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          linhas_erro?: number
          linhas_sucesso?: number
          nome_arquivo?: string
          resumo_json?: Json | null
          tipo?: string | null
          tipo_arquivo?: string
          total_linhas?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          collaborator_id: string | null
          created_at: string | null
          id: string
          phone: string
          updated_at: string | null
          verification_code: string | null
          verified: boolean | null
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string | null
          id?: string
          phone: string
          updated_at?: string | null
          verification_code?: string | null
          verified?: boolean | null
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string | null
          id?: string
          phone?: string
          updated_at?: string | null
          verification_code?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_circuits: {
        Row: {
          corrente_in_a: number | null
          created_at: string
          fatores_json: Json | null
          id: string
          kw: number | null
          revision_id: string
          saida_json: Json | null
          tag: string
          tensao_v: number | null
          tipo_partida: string | null
          wbs_id: string | null
        }
        Insert: {
          corrente_in_a?: number | null
          created_at?: string
          fatores_json?: Json | null
          id?: string
          kw?: number | null
          revision_id: string
          saida_json?: Json | null
          tag: string
          tensao_v?: number | null
          tipo_partida?: string | null
          wbs_id?: string | null
        }
        Update: {
          corrente_in_a?: number | null
          created_at?: string
          fatores_json?: Json | null
          id?: string
          kw?: number | null
          revision_id?: string
          saida_json?: Json | null
          tag?: string
          tensao_v?: number | null
          tipo_partida?: string | null
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_circuits_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_circuits_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_documents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nome_arquivo: string
          revision_id: string
          storage_path: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nome_arquivo: string
          revision_id: string
          storage_path: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nome_arquivo?: string
          revision_id?: string
          storage_path?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_documents_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_equipment_items: {
        Row: {
          catalog_id: string | null
          codigo_snapshot: string | null
          created_at: string | null
          created_by: string | null
          descricao_snapshot: string
          id: string
          meses: number | null
          observacao: string | null
          preco_mensal_override: number | null
          preco_mensal_ref_snapshot: number | null
          qtd: number | null
          revision_id: string
          total: number | null
          unidade_snapshot: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          catalog_id?: string | null
          codigo_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_snapshot: string
          id?: string
          meses?: number | null
          observacao?: string | null
          preco_mensal_override?: number | null
          preco_mensal_ref_snapshot?: number | null
          qtd?: number | null
          revision_id: string
          total?: number | null
          unidade_snapshot?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          catalog_id?: string | null
          codigo_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_snapshot?: string
          id?: string
          meses?: number | null
          observacao?: string | null
          preco_mensal_override?: number | null
          preco_mensal_ref_snapshot?: number | null
          qtd?: number | null
          revision_id?: string
          total?: number | null
          unidade_snapshot?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_equipment_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_equipment_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_equipment_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_fabricantes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      budget_generated_materials: {
        Row: {
          circuit_id: string
          created_at: string
          descricao: string
          id: string
          material_codigo: string
          quantidade: number
          revision_id: string
          status: Database["public"]["Enums"]["gen_status"]
          unidade: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          descricao: string
          id?: string
          material_codigo: string
          quantidade?: number
          revision_id: string
          status?: Database["public"]["Enums"]["gen_status"]
          unidade: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          descricao?: string
          id?: string
          material_codigo?: string
          quantidade?: number
          revision_id?: string
          status?: Database["public"]["Enums"]["gen_status"]
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_generated_materials_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "budget_circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_generated_materials_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_histogram: {
        Row: {
          created_at: string
          custo_total: number
          hh_100: number
          hh_50: number
          hh_normais: number
          hh_total: number
          id: string
          labor_role_id: string
          mes_ref: string
          revision_id: string
        }
        Insert: {
          created_at?: string
          custo_total?: number
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id: string
          mes_ref: string
          revision_id: string
        }
        Update: {
          created_at?: string
          custo_total?: number
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id?: string
          mes_ref?: string
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_histogram_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_histogram_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_histogram_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_labor_catalog_tags: {
        Row: {
          role_id: string
          tag_id: string
        }
        Insert: {
          role_id: string
          tag_id: string
        }
        Update: {
          role_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_catalog_tags_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_catalog_tags_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_catalog_tags_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "budget_labor_catalog_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_labor_categories: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_labor_charge_sets: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          encargos_sociais_pct: number | null
          fgts_pct: number | null
          id: string
          inss_pct: number | null
          nome: string
          outros_beneficios_pct: number | null
          outros_impostos_pct: number | null
          plano_saude_pct: number | null
          provisao_13o_pct: number | null
          provisao_ferias_pct: number | null
          provisao_rescisao_pct: number | null
          total_encargos_pct: number | null
          updated_at: string | null
          vale_refeicao_pct: number | null
          vale_transporte_pct: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          encargos_sociais_pct?: number | null
          fgts_pct?: number | null
          id?: string
          inss_pct?: number | null
          nome: string
          outros_beneficios_pct?: number | null
          outros_impostos_pct?: number | null
          plano_saude_pct?: number | null
          provisao_13o_pct?: number | null
          provisao_ferias_pct?: number | null
          provisao_rescisao_pct?: number | null
          total_encargos_pct?: number | null
          updated_at?: string | null
          vale_refeicao_pct?: number | null
          vale_transporte_pct?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          encargos_sociais_pct?: number | null
          fgts_pct?: number | null
          id?: string
          inss_pct?: number | null
          nome?: string
          outros_beneficios_pct?: number | null
          outros_impostos_pct?: number | null
          plano_saude_pct?: number | null
          provisao_13o_pct?: number | null
          provisao_ferias_pct?: number | null
          provisao_rescisao_pct?: number | null
          total_encargos_pct?: number | null
          updated_at?: string | null
          vale_refeicao_pct?: number | null
          vale_transporte_pct?: number | null
        }
        Relationships: []
      }
      budget_labor_groups: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      budget_labor_import_runs: {
        Row: {
          created_count: number | null
          error_count: number | null
          filename: string | null
          id: string
          imported_at: string | null
          imported_by: string | null
          total_rows: number | null
          updated_count: number | null
        }
        Insert: {
          created_count?: number | null
          error_count?: number | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          total_rows?: number | null
          updated_count?: number | null
        }
        Update: {
          created_count?: number | null
          error_count?: number | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          total_rows?: number | null
          updated_count?: number | null
        }
        Relationships: []
      }
      budget_labor_items: {
        Row: {
          carga_horaria_snapshot: number
          catalog_id: string | null
          codigo_snapshot: string
          created_at: string | null
          created_by: string | null
          id: string
          nome_snapshot: string
          observacao: string | null
          qtd_hh: number
          regime_snapshot: Database["public"]["Enums"]["budget_labor_regime"]
          revision_id: string
          tipo_mo_snapshot: Database["public"]["Enums"]["budget_labor_type"]
          total: number | null
          updated_at: string | null
          updated_by: string | null
          valor_hh_override: number | null
          valor_ref_hh_snapshot: number | null
        }
        Insert: {
          carga_horaria_snapshot?: number
          catalog_id?: string | null
          codigo_snapshot: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome_snapshot: string
          observacao?: string | null
          qtd_hh?: number
          regime_snapshot?: Database["public"]["Enums"]["budget_labor_regime"]
          revision_id: string
          tipo_mo_snapshot?: Database["public"]["Enums"]["budget_labor_type"]
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor_hh_override?: number | null
          valor_ref_hh_snapshot?: number | null
        }
        Update: {
          carga_horaria_snapshot?: number
          catalog_id?: string | null
          codigo_snapshot?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome_snapshot?: string
          observacao?: string | null
          qtd_hh?: number
          regime_snapshot?: Database["public"]["Enums"]["budget_labor_regime"]
          revision_id?: string
          tipo_mo_snapshot?: Database["public"]["Enums"]["budget_labor_type"]
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor_hh_override?: number | null
          valor_ref_hh_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "budget_labor_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_labor_roles_catalog: {
        Row: {
          ativo: boolean | null
          beneficios_mensal: number | null
          carga_horaria_mensal: number | null
          category_id: string | null
          charge_set_id: string | null
          codigo: string
          created_at: string | null
          group_id: string | null
          hh_custo: number | null
          id: string
          insalubridade_pct: number | null
          nome: string
          observacao: string | null
          periculosidade_pct: number | null
          produtividade_tipo:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade: string | null
          produtividade_valor: number | null
          regime: Database["public"]["Enums"]["budget_labor_regime"]
          salario_base: number
          tipo_mo: Database["public"]["Enums"]["budget_labor_type"]
          updated_at: string | null
          valor_ref_hh: number | null
        }
        Insert: {
          ativo?: boolean | null
          beneficios_mensal?: number | null
          carga_horaria_mensal?: number | null
          category_id?: string | null
          charge_set_id?: string | null
          codigo: string
          created_at?: string | null
          group_id?: string | null
          hh_custo?: number | null
          id?: string
          insalubridade_pct?: number | null
          nome: string
          observacao?: string | null
          periculosidade_pct?: number | null
          produtividade_tipo?:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade?: string | null
          produtividade_valor?: number | null
          regime?: Database["public"]["Enums"]["budget_labor_regime"]
          salario_base?: number
          tipo_mo?: Database["public"]["Enums"]["budget_labor_type"]
          updated_at?: string | null
          valor_ref_hh?: number | null
        }
        Update: {
          ativo?: boolean | null
          beneficios_mensal?: number | null
          carga_horaria_mensal?: number | null
          category_id?: string | null
          charge_set_id?: string | null
          codigo?: string
          created_at?: string | null
          group_id?: string | null
          hh_custo?: number | null
          id?: string
          insalubridade_pct?: number | null
          nome?: string
          observacao?: string | null
          periculosidade_pct?: number | null
          produtividade_tipo?:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade?: string | null
          produtividade_valor?: number | null
          regime?: Database["public"]["Enums"]["budget_labor_regime"]
          salario_base?: number
          tipo_mo?: Database["public"]["Enums"]["budget_labor_type"]
          updated_at?: string | null
          valor_ref_hh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_roles_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_catalog_charge_set_id_fkey"
            columns: ["charge_set_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_charge_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_catalog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_labor_roles_history: {
        Row: {
          change_type: string
          changed_at: string | null
          changed_by: string | null
          id: string
          import_run_id: string | null
          new_values: Json | null
          old_values: Json | null
          role_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          import_run_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          role_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          import_run_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_roles_history_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_history_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_history_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
        ]
      }
      budget_labor_tags: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      budget_material_items: {
        Row: {
          catalog_id: string | null
          codigo: string | null
          descricao: string
          fator_dificuldade: number
          fornecimento: Database["public"]["Enums"]["supply_type"]
          hh_total: number
          hh_unitario: number
          id: string
          item_seq: number
          observacao: string | null
          preco_total: number
          preco_unit: number
          quantidade: number
          revision_id: string
          unidade: string
          wbs_id: string | null
        }
        Insert: {
          catalog_id?: string | null
          codigo?: string | null
          descricao: string
          fator_dificuldade?: number
          fornecimento?: Database["public"]["Enums"]["supply_type"]
          hh_total?: number
          hh_unitario?: number
          id?: string
          item_seq: number
          observacao?: string | null
          preco_total?: number
          preco_unit?: number
          quantidade?: number
          revision_id: string
          unidade: string
          wbs_id?: string | null
        }
        Update: {
          catalog_id?: string | null
          codigo?: string | null
          descricao?: string
          fator_dificuldade?: number
          fornecimento?: Database["public"]["Enums"]["supply_type"]
          hh_total?: number
          hh_unitario?: number
          id?: string
          item_seq?: number
          observacao?: string | null
          preco_total?: number
          preco_unit?: number
          quantidade?: number
          revision_id?: string
          unidade?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_material_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_regions: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          uf?: string | null
        }
        Relationships: []
      }
      budget_revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_id: string
          condicoes_pagamento: string | null
          created_at: string
          created_by: string
          exclusoes: string | null
          id: string
          observacoes: string | null
          prazo_execucao_meses: number | null
          premissas: string | null
          pricebook_materiais_id: string | null
          pricebook_mo_id: string | null
          projeto_id: string | null
          revision_number: number
          sent_at: string | null
          status: Database["public"]["Enums"]["revision_status"]
          validade_proposta: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_id: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by: string
          exclusoes?: string | null
          id?: string
          observacoes?: string | null
          prazo_execucao_meses?: number | null
          premissas?: string | null
          pricebook_materiais_id?: string | null
          pricebook_mo_id?: string | null
          projeto_id?: string | null
          revision_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          validade_proposta?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string
          exclusoes?: string | null
          id?: string
          observacoes?: string | null
          prazo_execucao_meses?: number | null
          premissas?: string | null
          pricebook_materiais_id?: string | null
          pricebook_mo_id?: string | null
          projeto_id?: string | null
          revision_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          validade_proposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_pricebook_materiais_id_fkey"
            columns: ["pricebook_materiais_id"]
            isOneToOne: false
            referencedRelation: "pricebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_pricebook_mo_id_fkey"
            columns: ["pricebook_mo_id"]
            isOneToOne: false
            referencedRelation: "pricebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      budget_summary: {
        Row: {
          id: string
          margem_pct: number
          margem_rs: number
          markup_pct_aplicado: number
          preco_venda: number
          revision_id: string
          subtotal_custo: number
          total_canteiro: number
          total_engenharia: number
          total_equipamentos: number
          total_hh_materiais: number
          total_impostos: number
          total_materiais: number
          total_mo: number
          total_mobilizacao: number
          updated_at: string
          valor_markup: number
        }
        Insert: {
          id?: string
          margem_pct?: number
          margem_rs?: number
          markup_pct_aplicado?: number
          preco_venda?: number
          revision_id: string
          subtotal_custo?: number
          total_canteiro?: number
          total_engenharia?: number
          total_equipamentos?: number
          total_hh_materiais?: number
          total_impostos?: number
          total_materiais?: number
          total_mo?: number
          total_mobilizacao?: number
          updated_at?: string
          valor_markup?: number
        }
        Update: {
          id?: string
          margem_pct?: number
          margem_rs?: number
          markup_pct_aplicado?: number
          preco_venda?: number
          revision_id?: string
          subtotal_custo?: number
          total_canteiro?: number
          total_engenharia?: number
          total_equipamentos?: number
          total_hh_materiais?: number
          total_impostos?: number
          total_materiais?: number
          total_mo?: number
          total_mobilizacao?: number
          updated_at?: string
          valor_markup?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_summary_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_taxes: {
        Row: {
          aliquota: number
          ativo: boolean
          created_at: string
          id: string
          revision_id: string
          tax_catalog_id: string
        }
        Insert: {
          aliquota?: number
          ativo?: boolean
          created_at?: string
          id?: string
          revision_id: string
          tax_catalog_id: string
        }
        Update: {
          aliquota?: number
          ativo?: boolean
          created_at?: string
          id?: string
          revision_id?: string
          tax_catalog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_taxes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_taxes_tax_catalog_id_fkey"
            columns: ["tax_catalog_id"]
            isOneToOne: false
            referencedRelation: "tax_rules_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_wbs: {
        Row: {
          code: string
          id: string
          nome: string
          ordem: number
          parent_id: string | null
          revision_id: string
          tipo: Database["public"]["Enums"]["wbs_type"]
        }
        Insert: {
          code: string
          id?: string
          nome: string
          ordem?: number
          parent_id?: string | null
          revision_id: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Update: {
          code?: string
          id?: string
          nome?: string
          ordem?: number
          parent_id?: string | null
          revision_id?: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Relationships: [
          {
            foreignKeyName: "budget_wbs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_wbs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_number: string
          cliente_id: string
          created_at: string
          id: string
          local: string | null
          obra_nome: string
          responsavel_user_id: string
          updated_at: string
        }
        Insert: {
          budget_number: string
          cliente_id: string
          created_at?: string
          id?: string
          local?: string | null
          obra_nome: string
          responsavel_user_id: string
          updated_at?: string
        }
        Update: {
          budget_number?: string
          cliente_id?: string
          created_at?: string
          id?: string
          local?: string | null
          obra_nome?: string
          responsavel_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_schedule: {
        Row: {
          categoria: string
          created_at: string
          id: string
          mes_ref: string
          revision_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          mes_ref: string
          revision_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          mes_ref?: string
          revision_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_schedule_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_contabeis: {
        Row: {
          ativa: boolean
          conta_dre: string
          created_at: string | null
          grupo_nome: string
          grupo_ordem: number
          grupo_tipo: string
          id: string
          keywords: string[] | null
          nome: string
          observacoes: string | null
          ordem: number
          tipo_gasto: string | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean
          conta_dre?: string
          created_at?: string | null
          grupo_nome: string
          grupo_ordem?: number
          grupo_tipo: string
          id?: string
          keywords?: string[] | null
          nome: string
          observacoes?: string | null
          ordem?: number
          tipo_gasto?: string | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean
          conta_dre?: string
          created_at?: string | null
          grupo_nome?: string
          grupo_ordem?: number
          grupo_tipo?: string
          id?: string
          keywords?: string[] | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          tipo_gasto?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      collaborator_history: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          collaborator_id: string
          id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          collaborator_id: string
          id?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          collaborator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_history_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          bairro: string | null
          birth_date: string | null
          cep: string | null
          cidade: string | null
          cpf: string
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          endereco: string | null
          equipe: string | null
          foto_url: string | null
          full_name: string
          hire_date: string
          horario_descricao: string | null
          id: string
          numero_folha: string | null
          origem: string
          phone: string | null
          pis: string | null
          position: string | null
          regiao: Database["public"]["Enums"]["regiao_colaborador"] | null
          rg: string | null
          secullum_data_alteracao: string | null
          secullum_id: number | null
          sexo: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          uf: string | null
          ultimo_sync_at: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          bairro?: string | null
          birth_date?: string | null
          cep?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          endereco?: string | null
          equipe?: string | null
          foto_url?: string | null
          full_name: string
          hire_date: string
          horario_descricao?: string | null
          id?: string
          numero_folha?: string | null
          origem?: string
          phone?: string | null
          pis?: string | null
          position?: string | null
          regiao?: Database["public"]["Enums"]["regiao_colaborador"] | null
          rg?: string | null
          secullum_data_alteracao?: string | null
          secullum_id?: number | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          uf?: string | null
          ultimo_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          bairro?: string | null
          birth_date?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          endereco?: string | null
          equipe?: string | null
          foto_url?: string | null
          full_name?: string
          hire_date?: string
          horario_descricao?: string | null
          id?: string
          numero_folha?: string | null
          origem?: string
          phone?: string | null
          pis?: string | null
          position?: string | null
          regiao?: Database["public"]["Enums"]["regiao_colaborador"] | null
          rg?: string | null
          secullum_data_alteracao?: string | null
          secullum_id?: number | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          uf?: string | null
          ultimo_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      conciliacao_imports: {
        Row: {
          created_at: string | null
          dados: Json
          id: string
          metadata: Json | null
          nome_arquivo: string | null
          origem: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_ref: string
          saldo_anterior: number | null
          status: string | null
          tipo: string
          total_lancamentos: number | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          dados: Json
          id?: string
          metadata?: Json | null
          nome_arquivo?: string | null
          origem?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_ref: string
          saldo_anterior?: number | null
          status?: string | null
          tipo: string
          total_lancamentos?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          dados?: Json
          id?: string
          metadata?: Json | null
          nome_arquivo?: string | null
          origem?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_ref?: string
          saldo_anterior?: number | null
          status?: string | null
          tipo?: string
          total_lancamentos?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      conciliacao_resultados: {
        Row: {
          camada_a: number | null
          camada_b: number | null
          camada_c: number | null
          camada_d: number | null
          created_at: string | null
          id: string
          periodo_ref: string
          resultado: Json
          status: string | null
          total_cartao_importaveis: number | null
          total_conciliados: number | null
          total_divergencias: number | null
          total_em_atraso: number | null
          updated_at: string | null
        }
        Insert: {
          camada_a?: number | null
          camada_b?: number | null
          camada_c?: number | null
          camada_d?: number | null
          created_at?: string | null
          id?: string
          periodo_ref: string
          resultado: Json
          status?: string | null
          total_cartao_importaveis?: number | null
          total_conciliados?: number | null
          total_divergencias?: number | null
          total_em_atraso?: number | null
          updated_at?: string | null
        }
        Update: {
          camada_a?: number | null
          camada_b?: number | null
          camada_c?: number | null
          camada_d?: number | null
          created_at?: string | null
          id?: string
          periodo_ref?: string
          resultado?: Json
          status?: string | null
          total_cartao_importaveis?: number | null
          total_conciliados?: number | null
          total_divergencias?: number | null
          total_em_atraso?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custo_projeto_dia: {
        Row: {
          colaborador_id: string
          cpf: string
          created_at: string
          custo_100: number | null
          custo_50: number | null
          custo_hora: number | null
          custo_normal: number | null
          custo_noturno: number | null
          custo_total: number | null
          data: string
          falta_horas: number
          horas_100: number
          horas_50: number
          horas_normais: number
          horas_noturnas: number
          id: string
          observacao: string | null
          projeto_id: string
          status: Database["public"]["Enums"]["custo_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          cpf: string
          created_at?: string
          custo_100?: number | null
          custo_50?: number | null
          custo_hora?: number | null
          custo_normal?: number | null
          custo_noturno?: number | null
          custo_total?: number | null
          data: string
          falta_horas?: number
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          observacao?: string | null
          projeto_id: string
          status: Database["public"]["Enums"]["custo_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          cpf?: string
          created_at?: string
          custo_100?: number | null
          custo_50?: number | null
          custo_hora?: number | null
          custo_normal?: number | null
          custo_noturno?: number | null
          custo_total?: number | null
          data?: string
          falta_horas?: number
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          observacao?: string | null
          projeto_id?: string
          status?: Database["public"]["Enums"]["custo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custo_projeto_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      custos_colaborador: {
        Row: {
          beneficios: number
          classificacao: string
          colaborador_id: string
          created_at: string
          created_by: string | null
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string
          motivo_alteracao: string
          observacao: string
          periculosidade: boolean
          salario_base: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficios?: number
          classificacao?: string
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia: string
          motivo_alteracao?: string
          observacao?: string
          periculosidade?: boolean
          salario_base: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficios?: number
          classificacao?: string
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          motivo_alteracao?: string
          observacao?: string
          periculosidade?: boolean
          salario_base?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_diretos_projeto: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          documento: string | null
          fornecedor: string | null
          id: string
          observacao: string | null
          projeto_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      depreciacao_config: {
        Row: {
          created_at: string
          depreciacao_mensal: number | null
          id: string
          metodo: string | null
          updated_at: string
          valor_residual: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          depreciacao_mensal?: number | null
          id?: string
          metodo?: string | null
          updated_at?: string
          valor_residual?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          depreciacao_mensal?: number | null
          id?: string
          metodo?: string | null
          updated_at?: string
          valor_residual?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciacao_config_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_deslocamento: {
        Row: {
          colaborador_id: string | null
          comprovante_url: string | null
          created_at: string
          data_despesa: string | null
          descricao: string | null
          id: string
          projeto_id: string | null
          tipo: string
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          colaborador_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_despesa?: string | null
          descricao?: string | null
          id?: string
          projeto_id?: string | null
          tipo: string
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          colaborador_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_despesa?: string | null
          descricao?: string | null
          id?: string
          projeto_id?: string | null
          tipo?: string
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "despesas_deslocamento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_deslocamento_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_deslocamento_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "despesas_deslocamento_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "despesas_deslocamento_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          codigo: string
          created_at: string
          created_by: string | null
          empresa: string
          id: string
          razao_social: string
          segmento: string
          status: Database["public"]["Enums"]["empresa_status"]
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cnpj?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          empresa: string
          id?: string
          razao_social: string
          segmento: string
          status?: Database["public"]["Enums"]["empresa_status"]
          unidade: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cnpj?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          empresa?: string
          id?: string
          razao_social?: string
          segmento?: string
          status?: Database["public"]["Enums"]["empresa_status"]
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      encargos_modelo_clt: {
        Row: {
          created_at: string
          created_by: string | null
          fator_rescisao_fgts: number
          fgts: number
          fgts_a: number
          id: string
          inss: number
          inss_a: number
          provisao_13: number
          provisao_ferias: number
          ratsat: number
          salario_educacao: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fator_rescisao_fgts: number
          fgts: number
          fgts_a: number
          id?: string
          inss: number
          inss_a: number
          provisao_13: number
          provisao_ferias: number
          ratsat: number
          salario_educacao: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fator_rescisao_fgts?: number
          fgts?: number
          fgts_a?: number
          id?: string
          inss?: number
          inss_a?: number
          provisao_13?: number
          provisao_ferias?: number
          ratsat?: number
          salario_educacao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engineering_catalog: {
        Row: {
          created_at: string
          descricao: string
          hh_ref: number | null
          id: string
          tipo: Database["public"]["Enums"]["eng_type"]
          valor_ref: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          hh_ref?: number | null
          id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          valor_ref?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          hh_ref?: number | null
          id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          valor_ref?: number | null
        }
        Relationships: []
      }
      engineering_items: {
        Row: {
          catalog_id: string | null
          created_at: string
          descricao: string
          hh: number | null
          id: string
          labor_role_id: string | null
          revision_id: string
          tipo: Database["public"]["Enums"]["eng_type"]
          total: number
          valor: number | null
          wbs_id: string | null
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          descricao: string
          hh?: number | null
          id?: string
          labor_role_id?: string | null
          revision_id: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          total?: number
          valor?: number | null
          wbs_id?: string | null
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          descricao?: string
          hh?: number | null
          id?: string
          labor_role_id?: string | null
          revision_id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          total?: number
          valor?: number | null
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "engineering_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog: {
        Row: {
          ativo: boolean | null
          category_id: string | null
          codigo: string
          created_at: string | null
          created_by: string | null
          descricao: string
          group_id: string | null
          id: string
          observacao: string | null
          preco_mensal_ref: number | null
          subcategory_id: string | null
          unidade: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean | null
          category_id?: string | null
          codigo: string
          created_at?: string | null
          created_by?: string | null
          descricao: string
          group_id?: string | null
          id?: string
          observacao?: string | null
          preco_mensal_ref?: number | null
          subcategory_id?: string | null
          unidade?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean | null
          category_id?: string | null
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          group_id?: string | null
          id?: string
          observacao?: string | null
          preco_mensal_ref?: number | null
          subcategory_id?: string | null
          unidade?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equipment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "equipment_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog_requests: {
        Row: {
          codigo: string | null
          created_at: string
          created_catalog_id: string | null
          descricao: string
          id: string
          observacao: string | null
          preco_mensal_ref: number | null
          requested_at: string
          requested_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          unidade: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          created_catalog_id?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          preco_mensal_ref?: number | null
          requested_at?: string
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          unidade?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          created_catalog_id?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          preco_mensal_ref?: number | null
          requested_at?: string
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_requests_created_catalog_id_fkey"
            columns: ["created_catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_requests_created_catalog_id_fkey"
            columns: ["created_catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_equipment_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog_tags: {
        Row: {
          equipment_id: string
          tag_id: string
        }
        Insert: {
          equipment_id: string
          tag_id: string
        }
        Update: {
          equipment_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_tags_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_tags_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "vw_equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "equipment_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equipment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_groups: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      equipment_import_runs: {
        Row: {
          created_count: number | null
          error_count: number | null
          filename: string | null
          id: string
          imported_at: string | null
          imported_by: string | null
          total_rows: number | null
          updated_count: number | null
        }
        Insert: {
          created_count?: number | null
          error_count?: number | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          total_rows?: number | null
          updated_count?: number | null
        }
        Update: {
          created_count?: number | null
          error_count?: number | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          total_rows?: number | null
          updated_count?: number | null
        }
        Relationships: []
      }
      equipment_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          equipment_id: string
          id: string
          preco_anterior: number | null
          preco_novo: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          equipment_id: string
          id?: string
          preco_anterior?: number | null
          preco_novo?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          equipment_id?: string
          id?: string
          preco_anterior?: number | null
          preco_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_price_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_price_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "vw_equipment_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals: {
        Row: {
          catalog_id: string | null
          created_at: string
          descricao: string
          id: string
          meses: number
          quantidade: number
          revision_id: string
          total: number
          valor_mensal: number
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          meses?: number
          quantidade?: number
          revision_id: string
          total?: number
          valor_mensal?: number
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          meses?: number
          quantidade?: number
          revision_id?: string
          total?: number
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_rentals_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rentals_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          valor_mensal_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          valor_mensal_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          valor_mensal_ref?: number
        }
        Relationships: []
      }
      equipment_subcategories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_tags: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      labor_cost_snapshot: {
        Row: {
          custo_hora_he100: number
          custo_hora_he50: number
          custo_hora_normal: number
          id: string
          labor_role_id: string
          memoria_json: Json | null
          revision_id: string
          updated_at: string
        }
        Insert: {
          custo_hora_he100?: number
          custo_hora_he50?: number
          custo_hora_normal?: number
          id?: string
          labor_role_id: string
          memoria_json?: Json | null
          revision_id: string
          updated_at?: string
        }
        Update: {
          custo_hora_he100?: number
          custo_hora_he50?: number
          custo_hora_normal?: number
          id?: string
          labor_role_id?: string
          memoria_json?: Json | null
          revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_cost_snapshot_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_cost_snapshot_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_cost_snapshot_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_hh_allocations: {
        Row: {
          created_at: string
          custo_total: number
          descricao: string
          hh_100: number
          hh_50: number
          hh_normais: number
          hh_total: number
          id: string
          labor_role_id: string
          origem: Database["public"]["Enums"]["hh_origin"]
          revision_id: string
          wbs_id: string | null
        }
        Insert: {
          created_at?: string
          custo_total?: number
          descricao: string
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id: string
          origem?: Database["public"]["Enums"]["hh_origin"]
          revision_id: string
          wbs_id?: string | null
        }
        Update: {
          created_at?: string
          custo_total?: number
          descricao?: string
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id?: string
          origem?: Database["public"]["Enums"]["hh_origin"]
          revision_id?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_hh_allocations_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_incidence_groups: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      labor_incidence_item_prices: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          incidence_item_id: string
          preco_unitario: number
          regiao_id: string | null
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          incidence_item_id: string
          preco_unitario: number
          regiao_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          incidence_item_id?: string
          preco_unitario?: number
          regiao_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_incidence_item_prices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_item_prices_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_item_prices_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "labor_incidence_item_prices_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "budget_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_incidence_items: {
        Row: {
          ativo: boolean
          calc_tipo: Database["public"]["Enums"]["labor_incidence_calc_tipo"]
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string
          group_id: string
          id: string
          meses_default: number | null
          obrigatorio_default: boolean
          observacao_default: string | null
          preco_unitario_default: number | null
          qtd_default: number | null
          qtd_mes_default: number | null
          updated_at: string
          updated_by: string | null
          valor_mensal_default: number | null
        }
        Insert: {
          ativo?: boolean
          calc_tipo?: Database["public"]["Enums"]["labor_incidence_calc_tipo"]
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao: string
          group_id: string
          id?: string
          meses_default?: number | null
          obrigatorio_default?: boolean
          observacao_default?: string | null
          preco_unitario_default?: number | null
          qtd_default?: number | null
          qtd_mes_default?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_mensal_default?: number | null
        }
        Update: {
          ativo?: boolean
          calc_tipo?: Database["public"]["Enums"]["labor_incidence_calc_tipo"]
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          group_id?: string
          id?: string
          meses_default?: number | null
          obrigatorio_default?: boolean
          observacao_default?: string | null
          preco_unitario_default?: number | null
          qtd_default?: number | null
          qtd_mes_default?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_mensal_default?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_incidence_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "labor_incidence_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_role_incidence_costs"
            referencedColumns: ["group_id"]
          },
        ]
      }
      labor_incidence_role_rules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incidence_item_id: string
          is_applicable: boolean | null
          is_mandatory: boolean | null
          override_months_factor: number | null
          override_notes: string | null
          override_qty: number | null
          override_unit_price: number | null
          role_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidence_item_id: string
          is_applicable?: boolean | null
          is_mandatory?: boolean | null
          override_months_factor?: number | null
          override_notes?: string | null
          override_qty?: number | null
          override_unit_price?: number | null
          role_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidence_item_id?: string
          is_applicable?: boolean | null
          is_mandatory?: boolean | null
          override_months_factor?: number | null
          override_notes?: string | null
          override_qty?: number | null
          override_unit_price?: number | null
          role_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_incidence_role_rules_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_role_rules_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "labor_incidence_role_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_role_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_role_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
        ]
      }
      labor_incidence_template_items: {
        Row: {
          ativo_default: boolean
          id: string
          incidence_item_id: string
          meses_override: number | null
          observacao: string | null
          preco_unitario_override: number | null
          qtd_mes_override: number | null
          qtd_override: number | null
          template_id: string
          valor_mensal_override: number | null
        }
        Insert: {
          ativo_default?: boolean
          id?: string
          incidence_item_id: string
          meses_override?: number | null
          observacao?: string | null
          preco_unitario_override?: number | null
          qtd_mes_override?: number | null
          qtd_override?: number | null
          template_id: string
          valor_mensal_override?: number | null
        }
        Update: {
          ativo_default?: boolean
          id?: string
          incidence_item_id?: string
          meses_override?: number | null
          observacao?: string | null
          preco_unitario_override?: number | null
          qtd_mes_override?: number | null
          qtd_override?: number | null
          template_id?: string
          valor_mensal_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_incidence_template_items_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_incidence_template_items_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "labor_incidence_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_incidence_templates: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          tipo_mo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo_mo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo_mo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      labor_param_catalog: {
        Row: {
          adicional_noturno_pct_ref: number
          created_at: string
          custos_pessoa_json_ref: Json | null
          encargos_pct_ref: number
          he100_pct_ref: number
          he50_pct_ref: number
          id: string
          improdutividade_pct_ref: number
          incidencias_json_ref: Json | null
          insalubridade_pct_ref: number
          nome: string
          periculosidade_pct_ref: number
        }
        Insert: {
          adicional_noturno_pct_ref?: number
          created_at?: string
          custos_pessoa_json_ref?: Json | null
          encargos_pct_ref?: number
          he100_pct_ref?: number
          he50_pct_ref?: number
          id?: string
          improdutividade_pct_ref?: number
          incidencias_json_ref?: Json | null
          insalubridade_pct_ref?: number
          nome: string
          periculosidade_pct_ref?: number
        }
        Update: {
          adicional_noturno_pct_ref?: number
          created_at?: string
          custos_pessoa_json_ref?: Json | null
          encargos_pct_ref?: number
          he100_pct_ref?: number
          he50_pct_ref?: number
          id?: string
          improdutividade_pct_ref?: number
          incidencias_json_ref?: Json | null
          insalubridade_pct_ref?: number
          nome?: string
          periculosidade_pct_ref?: number
        }
        Relationships: []
      }
      labor_parameters: {
        Row: {
          adicional_noturno_pct: number
          created_at: string
          custos_pessoa_json: Json | null
          encargos_pct: number
          he100_pct: number
          he50_pct: number
          id: string
          improdutividade_pct: number
          incidencias_json: Json | null
          insalubridade_pct: number
          periculosidade_pct: number
          revision_id: string
          updated_at: string
        }
        Insert: {
          adicional_noturno_pct?: number
          created_at?: string
          custos_pessoa_json?: Json | null
          encargos_pct?: number
          he100_pct?: number
          he50_pct?: number
          id?: string
          improdutividade_pct?: number
          incidencias_json?: Json | null
          insalubridade_pct?: number
          periculosidade_pct?: number
          revision_id: string
          updated_at?: string
        }
        Update: {
          adicional_noturno_pct?: number
          created_at?: string
          custos_pessoa_json?: Json | null
          encargos_pct?: number
          he100_pct?: number
          he50_pct?: number
          id?: string
          improdutividade_pct?: number
          incidencias_json?: Json | null
          insalubridade_pct?: number
          periculosidade_pct?: number
          revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_parameters_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_role_catalog: {
        Row: {
          carga_horaria_ref: number
          created_at: string
          funcao: string
          id: string
          modalidade: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref: number
        }
        Insert: {
          carga_horaria_ref?: number
          created_at?: string
          funcao: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref?: number
        }
        Update: {
          carga_horaria_ref?: number
          created_at?: string
          funcao?: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref?: number
        }
        Relationships: []
      }
      labor_role_incidence: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          incidence_item_id: string
          labor_role_id: string
          meses_override: number | null
          obrigatorio: boolean | null
          observacao: string | null
          preco_unitario_override: number | null
          qtd_mes_override: number | null
          qtd_override: number | null
          updated_at: string
          updated_by: string | null
          valor_mensal_override: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          incidence_item_id: string
          labor_role_id: string
          meses_override?: number | null
          obrigatorio?: boolean | null
          observacao?: string | null
          preco_unitario_override?: number | null
          qtd_mes_override?: number | null
          qtd_override?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_mensal_override?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          incidence_item_id?: string
          labor_role_id?: string
          meses_override?: number | null
          obrigatorio?: boolean | null
          observacao?: string | null
          preco_unitario_override?: number | null
          qtd_mes_override?: number | null
          qtd_override?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_mensal_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_role_incidence_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
        ]
      }
      labor_roles: {
        Row: {
          ativo: boolean
          carga_horaria_mensal: number
          catalog_id: string | null
          created_at: string
          funcao: string
          id: string
          modalidade: Database["public"]["Enums"]["labor_modality"]
          revision_id: string
          salario_base: number
        }
        Insert: {
          ativo?: boolean
          carga_horaria_mensal?: number
          catalog_id?: string | null
          created_at?: string
          funcao: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          revision_id: string
          salario_base?: number
        }
        Update: {
          ativo?: boolean
          carga_horaria_mensal?: number
          catalog_id?: string | null
          created_at?: string
          funcao?: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          revision_id?: string
          salario_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "labor_roles_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "labor_role_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_roles_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          alertas_enviados: number | null
          comprovante_url: string | null
          created_at: string
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          km_previsto: number | null
          km_realizado: number | null
          status: string | null
          tipo: string
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          alertas_enviados?: number | null
          comprovante_url?: string | null
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          km_previsto?: number | null
          km_realizado?: number | null
          status?: string | null
          tipo: string
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          alertas_enviados?: number | null
          comprovante_url?: string | null
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          km_previsto?: number | null
          km_realizado?: number | null
          status?: string | null
          tipo?: string
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      markup_rule_sets: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      markup_rules: {
        Row: {
          allow_per_wbs: boolean
          created_at: string
          id: string
          markup_pct: number
          revision_id: string
        }
        Insert: {
          allow_per_wbs?: boolean
          created_at?: string
          id?: string
          markup_pct?: number
          revision_id: string
        }
        Update: {
          allow_per_wbs?: boolean
          created_at?: string
          id?: string
          markup_pct?: number
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "markup_rules_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      markup_rules_catalog: {
        Row: {
          allow_per_wbs: boolean
          id: string
          markup_pct: number
          set_id: string
        }
        Insert: {
          allow_per_wbs?: boolean
          id?: string
          markup_pct?: number
          set_id: string
        }
        Update: {
          allow_per_wbs?: boolean
          id?: string
          markup_pct?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "markup_rules_catalog_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "markup_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog: {
        Row: {
          ativo: boolean
          categoria: string | null
          category_id: string | null
          codigo: string
          created_at: string
          descricao: string
          group_id: string | null
          hh_unit_ref: number | null
          id: string
          preco_ref: number | null
          subcategory_id: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          category_id?: string | null
          codigo: string
          created_at?: string
          descricao: string
          group_id?: string | null
          hh_unit_ref?: number | null
          id?: string
          preco_ref?: number | null
          subcategory_id?: string | null
          unidade: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          category_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          group_id?: string | null
          hh_unit_ref?: number | null
          id?: string
          preco_ref?: number | null
          subcategory_id?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "material_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalog_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "material_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog_price_history: {
        Row: {
          catalog_id: string
          changed_at: string
          changed_by: string | null
          codigo: string
          id: string
          import_run_id: string | null
          new_price: number | null
          old_price: number | null
        }
        Insert: {
          catalog_id: string
          changed_at?: string
          changed_by?: string | null
          codigo: string
          id?: string
          import_run_id?: string | null
          new_price?: number | null
          old_price?: number | null
        }
        Update: {
          catalog_id?: string
          changed_at?: string
          changed_by?: string | null
          codigo?: string
          id?: string
          import_run_id?: string | null
          new_price?: number | null
          old_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_catalog_price_history_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalog_price_history_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "arquivos_importacao"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog_tags: {
        Row: {
          material_id: string
          tag_id: string
        }
        Insert: {
          material_id: string
          tag_id: string
        }
        Update: {
          material_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_catalog_tags_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalog_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "material_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog_variants: {
        Row: {
          ativo: boolean
          catalog_id: string
          created_at: string
          created_by: string | null
          fabricante: string
          id: string
          preco_ref: number
          sku: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          catalog_id: string
          created_at?: string
          created_by?: string | null
          fabricante: string
          id?: string
          preco_ref?: number
          sku?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          catalog_id?: string
          created_at?: string
          created_by?: string | null
          fabricante?: string
          id?: string
          preco_ref?: number
          sku?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_catalog_variants_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "material_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      material_groups: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      material_pricebook_items: {
        Row: {
          catalog_id: string
          created_at: string
          fabricante_id: string | null
          fonte: string | null
          id: string
          moeda: string | null
          preco: number
          pricebook_id: string
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          catalog_id: string
          created_at?: string
          fabricante_id?: string | null
          fonte?: string | null
          id?: string
          moeda?: string | null
          preco?: number
          pricebook_id: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          catalog_id?: string
          created_at?: string
          fabricante_id?: string | null
          fonte?: string | null
          id?: string
          moeda?: string | null
          preco?: number
          pricebook_id?: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_pricebook_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_pricebook_items_fabricante_id_fkey"
            columns: ["fabricante_id"]
            isOneToOne: false
            referencedRelation: "budget_fabricantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_pricebook_items_pricebook_id_fkey"
            columns: ["pricebook_id"]
            isOneToOne: false
            referencedRelation: "pricebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      material_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_tags: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      material_variant_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          import_run_id: string | null
          new_price: number
          old_price: number
          variant_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          import_run_id?: string | null
          new_price: number
          old_price: number
          variant_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          import_run_id?: string | null
          new_price?: number
          old_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_variant_price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "material_catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_pricebook_items: {
        Row: {
          created_at: string
          fonte: string | null
          funcao_id: string
          hh_custo: number
          id: string
          pricebook_id: string
          produtividade_tipo:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade: string | null
          produtividade_valor: number | null
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          created_at?: string
          fonte?: string | null
          funcao_id: string
          hh_custo?: number
          id?: string
          pricebook_id: string
          produtividade_tipo?:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade?: string | null
          produtividade_valor?: number | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          created_at?: string
          fonte?: string | null
          funcao_id?: string
          hh_custo?: number
          id?: string
          pricebook_id?: string
          produtividade_tipo?:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade?: string | null
          produtividade_valor?: number | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mo_pricebook_items_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_pricebook_items_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_pricebook_items_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "mo_pricebook_items_pricebook_id_fkey"
            columns: ["pricebook_id"]
            isOneToOne: false
            referencedRelation: "pricebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          unidade: string | null
          valor_unitario_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          unidade?: string | null
          valor_unitario_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          unidade?: string | null
          valor_unitario_ref?: number
        }
        Relationships: []
      }
      mobilization_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          quantidade: number
          revision_id: string
          total: number
          unidade: string | null
          valor_unitario: number
          wbs_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          quantidade?: number
          revision_id: string
          total?: number
          unidade?: string | null
          valor_unitario?: number
          wbs_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          quantidade?: number
          revision_id?: string
          total?: number
          unidade?: string | null
          valor_unitario?: number
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilization_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      multas_veiculo: {
        Row: {
          colaborador_id: string | null
          comprovante_url: string | null
          created_at: string
          data_infracao: string | null
          data_vencimento: string | null
          id: string
          status: string | null
          tipo: string | null
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          colaborador_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_infracao?: string | null
          data_vencimento?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          colaborador_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_infracao?: string | null
          data_vencimento?: string | null
          id?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multas_veiculo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      omie_categoria_mapeamento: {
        Row: {
          ativo: boolean | null
          categoria_contabil_id: string | null
          codigo_omie: string
          conta_dre_omie: string | null
          conta_dre_override: string | null
          created_at: string | null
          descricao_omie: string | null
          id: string
          tipo_categoria: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_contabil_id?: string | null
          codigo_omie: string
          conta_dre_omie?: string | null
          conta_dre_override?: string | null
          created_at?: string | null
          descricao_omie?: string | null
          id?: string
          tipo_categoria?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_contabil_id?: string | null
          codigo_omie?: string
          conta_dre_omie?: string | null
          conta_dre_override?: string | null
          created_at?: string | null
          descricao_omie?: string | null
          id?: string
          tipo_categoria?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omie_categoria_mapeamento_categoria_contabil_id_fkey"
            columns: ["categoria_contabil_id"]
            isOneToOne: false
            referencedRelation: "categorias_contabeis"
            referencedColumns: ["id"]
          },
        ]
      }
      omie_contas_pagar: {
        Row: {
          categoria: string | null
          categorias_rateio: Json | null
          codigo_tipo_documento: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          descricao: string | null
          fornecedor: string | null
          fornecedor_cnpj: string | null
          id: string
          id_conta_corrente: number | null
          id_omie_titulo: number
          numero_documento: string | null
          observacoes: string | null
          omie_projeto_codigo: number | null
          parcela: string | null
          projeto_id: string | null
          raw_data: Json | null
          status: Database["public"]["Enums"]["titulo_status"]
          sync_id: string | null
          updated_at: string
          valor: number
          valor_cofins: number | null
          valor_csll: number | null
          valor_inss: number | null
          valor_ir: number | null
          valor_iss: number | null
          valor_pago: number
          valor_pis: number | null
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          categorias_rateio?: Json | null
          codigo_tipo_documento?: string | null
          created_at?: string
          data_emissao: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_cnpj?: string | null
          id?: string
          id_conta_corrente?: number | null
          id_omie_titulo: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_pago?: number
          valor_pis?: number | null
          vencimento: string
        }
        Update: {
          categoria?: string | null
          categorias_rateio?: Json | null
          codigo_tipo_documento?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_cnpj?: string | null
          id?: string
          id_conta_corrente?: number | null
          id_omie_titulo?: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_pago?: number
          valor_pis?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      omie_contas_receber: {
        Row: {
          categoria: string | null
          categorias_rateio: Json | null
          cliente: string | null
          cliente_cnpj: string | null
          codigo_tipo_documento: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string | null
          descricao: string | null
          id: string
          id_conta_corrente: number | null
          id_omie_titulo: number
          numero_documento: string | null
          observacoes: string | null
          omie_projeto_codigo: number | null
          parcela: string | null
          projeto_id: string | null
          raw_data: Json | null
          status: Database["public"]["Enums"]["titulo_status"]
          sync_id: string | null
          updated_at: string
          valor: number
          valor_cofins: number | null
          valor_csll: number | null
          valor_inss: number | null
          valor_ir: number | null
          valor_iss: number | null
          valor_pis: number | null
          valor_recebido: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          categorias_rateio?: Json | null
          cliente?: string | null
          cliente_cnpj?: string | null
          codigo_tipo_documento?: string | null
          created_at?: string
          data_emissao: string
          data_recebimento?: string | null
          descricao?: string | null
          id?: string
          id_conta_corrente?: number | null
          id_omie_titulo: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_pis?: number | null
          valor_recebido?: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          categorias_rateio?: Json | null
          cliente?: string | null
          cliente_cnpj?: string | null
          codigo_tipo_documento?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          descricao?: string | null
          id?: string
          id_conta_corrente?: number | null
          id_omie_titulo?: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_pis?: number | null
          valor_recebido?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      omie_projetos: {
        Row: {
          cod_int: string | null
          codigo: number
          created_at: string | null
          id: string
          inativo: boolean | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          cod_int?: string | null
          codigo: number
          created_at?: string | null
          id?: string
          inativo?: boolean | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          cod_int?: string | null
          codigo?: number
          created_at?: string | null
          id?: string
          inativo?: boolean | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      omie_sync_log: {
        Row: {
          detalhes: Json | null
          erro_mensagem: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          iniciado_por: string | null
          pendencias_criadas: number
          registros_atualizados: number
          registros_novos: number
          registros_processados: number
          status: Database["public"]["Enums"]["sync_status"]
          tipo: Database["public"]["Enums"]["sync_tipo"]
        }
        Insert: {
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          pendencias_criadas?: number
          registros_atualizados?: number
          registros_novos?: number
          registros_processados?: number
          status?: Database["public"]["Enums"]["sync_status"]
          tipo: Database["public"]["Enums"]["sync_tipo"]
        }
        Update: {
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          pendencias_criadas?: number
          registros_atualizados?: number
          registros_novos?: number
          registros_processados?: number
          status?: Database["public"]["Enums"]["sync_status"]
          tipo?: Database["public"]["Enums"]["sync_tipo"]
        }
        Relationships: []
      }
      pendencias_financeiras: {
        Row: {
          created_at: string
          detalhes: Json | null
          id: string
          origem: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id: string | null
          referencia_id: string
          referencia_omie_codigo: number | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["pendencia_status"]
          tipo: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          origem: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id?: string | null
          referencia_id: string
          referencia_omie_codigo?: number | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          origem?: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id?: string | null
          referencia_id?: string
          referencia_omie_codigo?: number | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo?: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      plano_manutencao: {
        Row: {
          created_at: string
          id: string
          intervalo_km: number | null
          intervalo_meses: number | null
          tipo: string
          ultima_data: string | null
          ultimo_km: number | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          intervalo_km?: number | null
          intervalo_meses?: number | null
          tipo: string
          ultima_data?: string | null
          ultimo_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          intervalo_km?: number | null
          intervalo_meses?: number | null
          tipo?: string
          ultima_data?: string | null
          ultimo_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_manutencao_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pricebooks: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          nome: string
          prioridade: number
          regiao_id: string | null
          tipo: Database["public"]["Enums"]["pricebook_type"]
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          prioridade?: number
          regiao_id?: string | null
          tipo: Database["public"]["Enums"]["pricebook_type"]
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          prioridade?: number
          regiao_id?: string | null
          tipo?: Database["public"]["Enums"]["pricebook_type"]
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricebooks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricebooks_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "budget_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          regiao: Database["public"]["Enums"]["regiao_colaborador"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          regiao?: Database["public"]["Enums"]["regiao_colaborador"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          regiao?: Database["public"]["Enums"]["regiao_colaborador"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          aprovacao_status:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          created_by: string | null
          data_fim_planejada: string | null
          data_fim_real: string | null
          data_inicio_planejada: string | null
          data_inicio_real: string | null
          descricao: string | null
          empresa_id: string
          horas_previstas: number | null
          id: string
          is_sistema: boolean | null
          motivo_reprovacao: string | null
          nome: string
          observacoes_aditivos: string | null
          observacoes_riscos: string | null
          omie_codigo: number | null
          omie_codint: string | null
          omie_last_error: string | null
          omie_last_sync_at: string | null
          omie_sync_status: string | null
          os: string
          regua_projeto_valor: number | null
          risco_escopo: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em: string | null
          solicitado_por: string | null
          status: string
          status_projeto: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos: boolean | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at: string
          updated_by: string | null
          valor_aditivos_previsto: number | null
          valor_contrato: number | null
        }
        Insert: {
          aprovacao_status?:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_planejada?: string | null
          data_fim_real?: string | null
          data_inicio_planejada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          empresa_id: string
          horas_previstas?: number | null
          id?: string
          is_sistema?: boolean | null
          motivo_reprovacao?: string | null
          nome: string
          observacoes_aditivos?: string | null
          observacoes_riscos?: string | null
          omie_codigo?: number | null
          omie_codint?: string | null
          omie_last_error?: string | null
          omie_last_sync_at?: string | null
          omie_sync_status?: string | null
          os: string
          regua_projeto_valor?: number | null
          risco_escopo?: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente?:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          status_projeto?: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos?: boolean | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at?: string
          updated_by?: string | null
          valor_aditivos_previsto?: number | null
          valor_contrato?: number | null
        }
        Update: {
          aprovacao_status?:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_planejada?: string | null
          data_fim_real?: string | null
          data_inicio_planejada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          empresa_id?: string
          horas_previstas?: number | null
          id?: string
          is_sistema?: boolean | null
          motivo_reprovacao?: string | null
          nome?: string
          observacoes_aditivos?: string | null
          observacoes_riscos?: string | null
          omie_codigo?: number | null
          omie_codint?: string | null
          omie_last_error?: string | null
          omie_last_sync_at?: string | null
          omie_sync_status?: string | null
          os?: string
          regua_projeto_valor?: number | null
          risco_escopo?: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente?:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          status_projeto?: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos?: boolean | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at?: string
          updated_by?: string | null
          valor_aditivos_previsto?: number | null
          valor_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_km: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_registro: string
          foto_odometro_url: string | null
          id: string
          km_calculado: number | null
          km_registrado: number
          origem_whatsapp: boolean | null
          projeto_id: string | null
          tipo: string
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_registro?: string
          foto_odometro_url?: string | null
          id?: string
          km_calculado?: number | null
          km_registrado: number
          origem_whatsapp?: boolean | null
          projeto_id?: string | null
          tipo: string
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_registro?: string
          foto_odometro_url?: string | null
          id?: string
          km_calculado?: number | null
          km_registrado?: number
          origem_whatsapp?: boolean | null
          projeto_id?: string | null
          tipo?: string
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_km_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_km_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_km_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "registros_km_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "registros_km_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      site_maintenance_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          valor_mensal_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          valor_mensal_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          valor_mensal_ref?: number
        }
        Relationships: []
      }
      site_maintenance_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          meses: number
          revision_id: string
          total: number
          valor_mensal: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          meses?: number
          revision_id: string
          total?: number
          valor_mensal?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          meses?: number
          revision_id?: string
          total?: number
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_maintenance_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      secullum_afastamentos: {
        Row: {
          id: string
          colaborador_id: string
          data_inicio: string
          data_fim: string
          motivo: string | null
          justificativa_nome: string | null
          tipo: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          colaborador_id: string
          data_inicio: string
          data_fim: string
          motivo?: string | null
          justificativa_nome?: string | null
          tipo?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          colaborador_id?: string
          data_inicio?: string
          data_fim?: string
          motivo?: string | null
          justificativa_nome?: string | null
          tipo?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secullum_afastamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      secullum_calculos: {
        Row: {
          id: string
          colaborador_id: string
          data: string
          horas_normais: number
          horas_faltas: number
          horas_extra_50: number
          horas_extra_100: number
          horas_extra_0: number
          horas_noturnas: number
          horas_extra_noturna: number
          horas_atraso: number
          horas_ajuste: number
          horas_folga: number
          carga_horaria: number
          dsr: number
          dsr_debito: number
          total_horas_trabalhadas: number | null
          tipo_dia: string
          batidas_json: unknown | null
          extras_json: unknown | null
          sync_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          colaborador_id: string
          data: string
          horas_normais?: number
          horas_faltas?: number
          horas_extra_50?: number
          horas_extra_100?: number
          horas_extra_0?: number
          horas_noturnas?: number
          horas_extra_noturna?: number
          horas_atraso?: number
          horas_ajuste?: number
          horas_folga?: number
          carga_horaria?: number
          dsr?: number
          dsr_debito?: number
          tipo_dia?: string
          batidas_json?: unknown | null
          extras_json?: unknown | null
          sync_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          colaborador_id?: string
          data?: string
          horas_normais?: number
          horas_faltas?: number
          horas_extra_50?: number
          horas_extra_100?: number
          horas_extra_0?: number
          horas_noturnas?: number
          horas_extra_noturna?: number
          horas_atraso?: number
          horas_ajuste?: number
          horas_folga?: number
          carga_horaria?: number
          dsr?: number
          dsr_debito?: number
          tipo_dia?: string
          batidas_json?: unknown | null
          extras_json?: unknown | null
          sync_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secullum_calculos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      secullum_sync_log: {
        Row: {
          id: string
          tipo: string
          etapa: string | null
          status: string
          data_inicio: string | null
          data_fim: string | null
          funcionarios_sincronizados: number
          funcionarios_criados: number
          funcionarios_atualizados: number
          funcionarios_ignorados: number
          calculos_sincronizados: number
          afastamentos_sincronizados: number
          fotos_sincronizadas: number
          apontamentos_criados: number
          apontamentos_atualizados: number
          requests_utilizadas: number
          erro_mensagem: string | null
          erro_detalhes: unknown | null
          duracao_ms: number | null
          triggered_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo: string
          etapa?: string | null
          status: string
          data_inicio?: string | null
          data_fim?: string | null
          funcionarios_sincronizados?: number
          funcionarios_criados?: number
          funcionarios_atualizados?: number
          funcionarios_ignorados?: number
          calculos_sincronizados?: number
          afastamentos_sincronizados?: number
          fotos_sincronizadas?: number
          apontamentos_criados?: number
          apontamentos_atualizados?: number
          requests_utilizadas?: number
          erro_mensagem?: string | null
          erro_detalhes?: unknown | null
          duracao_ms?: number | null
          triggered_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          etapa?: string | null
          status?: string
          data_inicio?: string | null
          data_fim?: string | null
          funcionarios_sincronizados?: number
          funcionarios_criados?: number
          funcionarios_atualizados?: number
          funcionarios_ignorados?: number
          calculos_sincronizados?: number
          afastamentos_sincronizados?: number
          fotos_sincronizadas?: number
          apontamentos_criados?: number
          apontamentos_atualizados?: number
          requests_utilizadas?: number
          erro_mensagem?: string | null
          erro_detalhes?: unknown | null
          duracao_ms?: number | null
          triggered_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tax_rule_sets: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          aplica_em: Database["public"]["Enums"]["tax_scope"]
          ativo: boolean
          base: Database["public"]["Enums"]["tax_base"]
          created_at: string
          id: string
          nome: string
          revision_id: string
          tipo: Database["public"]["Enums"]["tax_value_type"]
          valor: number
        }
        Insert: {
          aplica_em?: Database["public"]["Enums"]["tax_scope"]
          ativo?: boolean
          base?: Database["public"]["Enums"]["tax_base"]
          created_at?: string
          id?: string
          nome: string
          revision_id: string
          tipo?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Update: {
          aplica_em?: Database["public"]["Enums"]["tax_scope"]
          ativo?: boolean
          base?: Database["public"]["Enums"]["tax_base"]
          created_at?: string
          id?: string
          nome?: string
          revision_id?: string
          tipo?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules_catalog: {
        Row: {
          base: Database["public"]["Enums"]["tax_base"]
          escopo: Database["public"]["Enums"]["tax_scope"]
          id: string
          nome: string
          ordem: number
          set_id: string
          sigla: string
          tipo_valor: Database["public"]["Enums"]["tax_value_type"]
          valor: number
        }
        Insert: {
          base?: Database["public"]["Enums"]["tax_base"]
          escopo?: Database["public"]["Enums"]["tax_scope"]
          id?: string
          nome: string
          ordem?: number
          set_id: string
          sigla: string
          tipo_valor?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Update: {
          base?: Database["public"]["Enums"]["tax_base"]
          escopo?: Database["public"]["Enums"]["tax_scope"]
          id?: string
          nome?: string
          ordem?: number
          set_id?: string
          sigla?: string
          tipo_valor?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_catalog_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tax_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano: number | null
          apelido: string | null
          cor: string | null
          created_at: string
          created_by: string | null
          data_compra: string | null
          id: string
          km_atual: number | null
          marca: string | null
          media_km_litro_ref: number | null
          modelo: string | null
          placa: string
          projeto_atual_id: string | null
          renavam: string | null
          status: string | null
          tipo_combustivel: string | null
          updated_at: string
          valor_compra: number | null
          valor_fipe: number | null
          vida_util_meses: number | null
        }
        Insert: {
          ano?: number | null
          apelido?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          media_km_litro_ref?: number | null
          modelo?: string | null
          placa: string
          projeto_atual_id?: string | null
          renavam?: string | null
          status?: string | null
          tipo_combustivel?: string | null
          updated_at?: string
          valor_compra?: number | null
          valor_fipe?: number | null
          vida_util_meses?: number | null
        }
        Update: {
          ano?: number | null
          apelido?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          media_km_litro_ref?: number | null
          modelo?: string | null
          placa?: string
          projeto_atual_id?: string | null
          renavam?: string | null
          status?: string | null
          tipo_combustivel?: string | null
          updated_at?: string
          valor_compra?: number | null
          valor_fipe?: number | null
          vida_util_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_projeto_atual_id_fkey"
            columns: ["projeto_atual_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_projeto_atual_id_fkey"
            columns: ["projeto_atual_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "veiculos_projeto_atual_id_fkey"
            columns: ["projeto_atual_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      wbs_template_items: {
        Row: {
          code: string
          id: string
          nome: string
          ordem: number
          parent_code: string | null
          template_id: string
          tipo: Database["public"]["Enums"]["wbs_type"]
        }
        Insert: {
          code: string
          id?: string
          nome: string
          ordem?: number
          parent_code?: string | null
          template_id: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Update: {
          code?: string
          id?: string
          nome?: string
          ordem?: number
          parent_code?: string | null
          template_id?: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wbs_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wbs_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_templates: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_apontamentos_consolidado: {
        Row: {
          arquivo_importacao_id: string | null
          centro_custo: string | null
          cpf: string | null
          created_at: string | null
          data_apontamento: string | null
          data_atualizacao_gantt: string | null
          data_importacao: string | null
          descricao: string | null
          funcionario_id: string | null
          gantt_atualizado: boolean | null
          horas: number | null
          id: string | null
          is_pending: boolean | null
          linha_arquivo: number | null
          motivo_erro: string | null
          nome_funcionario: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"] | null
          os_numero: string | null
          projeto_id: string | null
          projeto_nome: string | null
          status_apontamento:
            | Database["public"]["Enums"]["apontamento_status"]
            | null
          status_integracao:
            | Database["public"]["Enums"]["integracao_status"]
            | null
          tarefa_id: string | null
          tarefa_nome: string | null
          tipo_hora: Database["public"]["Enums"]["tipo_hora"] | null
          updated_at: string | null
          usuario_lancamento: string | null
        }
        Relationships: []
      }
      vw_apontamentos_pendentes: {
        Row: {
          apontamento_dia_id: string | null
          colaborador_id: string | null
          colaborador_nome: string | null
          cpf: string | null
          departamento: string | null
          foto_url: string | null
          data: string | null
          horas_base_dia: number | null
          total_horas_apontadas: number | null
          horas_pendentes: number | null
          status: Database["public"]["Enums"]["apontamento_dia_status"] | null
          fonte_base: Database["public"]["Enums"]["apontamento_fonte_base"] | null
          horas_normais: number | null
          horas_extra_50: number | null
          horas_extra_100: number | null
          horas_noturnas: number | null
          tipo_dia: string | null
          tipo_afastamento: string | null
        }
        Relationships: []
      }
      vw_budget_equipment: {
        Row: {
          catalog_id: string | null
          descricao: string | null
          from_catalog: boolean | null
          id: string | null
          meses: number | null
          quantidade: number | null
          revision_id: string | null
          total: number | null
          valor_mensal: number | null
          valor_referencia: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_rentals_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rentals_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_labor_items: {
        Row: {
          carga_horaria_snapshot: number | null
          catalog_id: string | null
          catalog_nome_atual: string | null
          catalog_valor_ref_hh_atual: number | null
          codigo_snapshot: string | null
          created_at: string | null
          has_override: boolean | null
          id: string | null
          nome_snapshot: string | null
          observacao: string | null
          qtd_hh: number | null
          regime_snapshot:
            | Database["public"]["Enums"]["budget_labor_regime"]
            | null
          revision_id: string | null
          tipo_mo_snapshot:
            | Database["public"]["Enums"]["budget_labor_type"]
            | null
          total: number | null
          updated_at: string | null
          valor_hh_efetivo: number | null
          valor_hh_override: number | null
          valor_ref_hh_snapshot: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "budget_labor_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_labor_roles: {
        Row: {
          ativo: boolean | null
          carga_horaria_mensal: number | null
          catalog_id: string | null
          from_catalog: boolean | null
          funcao: string | null
          id: string | null
          modalidade: Database["public"]["Enums"]["labor_modality"] | null
          revision_id: string | null
          salario_base: number | null
          salario_referencia: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_roles_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "labor_role_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_roles_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_labor_roles_catalog: {
        Row: {
          ativo: boolean | null
          beneficios_mensal: number | null
          carga_horaria_mensal: number | null
          category_id: string | null
          category_nome: string | null
          charge_set_id: string | null
          charge_set_nome: string | null
          codigo: string | null
          created_at: string | null
          group_id: string | null
          group_nome: string | null
          hh_custo: number | null
          id: string | null
          insalubridade_pct: number | null
          nome: string | null
          observacao: string | null
          periculosidade_pct: number | null
          produtividade_tipo:
            | Database["public"]["Enums"]["budget_productivity_type"]
            | null
          produtividade_unidade: string | null
          produtividade_valor: number | null
          regime: Database["public"]["Enums"]["budget_labor_regime"] | null
          salario_base: number | null
          tipo_mo: Database["public"]["Enums"]["budget_labor_type"] | null
          total_encargos_pct: number | null
          updated_at: string | null
          valor_ref_hh: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_labor_roles_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_catalog_charge_set_id_fkey"
            columns: ["charge_set_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_charge_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_labor_roles_catalog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_materials: {
        Row: {
          catalog_id: string | null
          categoria: string | null
          codigo: string | null
          descricao: string | null
          fator_dificuldade: number | null
          fornecimento: Database["public"]["Enums"]["supply_type"] | null
          from_catalog: boolean | null
          hh_total: number | null
          hh_unitario_ref: number | null
          id: string | null
          item_seq: number | null
          observacao: string | null
          preco_referencia: number | null
          preco_total: number | null
          preco_unit: number | null
          quantidade: number | null
          revision_id: string | null
          unidade: string | null
          wbs_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_material_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_taxes: {
        Row: {
          aliquota: number | null
          aliquota_referencia: number | null
          ativo: boolean | null
          base: Database["public"]["Enums"]["tax_base"] | null
          created_at: string | null
          escopo: Database["public"]["Enums"]["tax_scope"] | null
          id: string | null
          nome: string | null
          revision_id: string | null
          sigla: string | null
          tax_catalog_id: string | null
          tipo_valor: Database["public"]["Enums"]["tax_value_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_taxes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_taxes_tax_catalog_id_fkey"
            columns: ["tax_catalog_id"]
            isOneToOne: false
            referencedRelation: "tax_rules_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custo_projeto: {
        Row: {
          custo_mao_obra: number | null
          custo_material: number | null
          custo_medio_hora: number | null
          custo_outro: number | null
          custo_servico: number | null
          custo_total: number | null
          empresa_nome: string | null
          horas_totais: number | null
          projeto_id: string | null
          projeto_nome: string | null
          projeto_os: string | null
          registros_mo_ok: number | null
          registros_sem_custo: number | null
          total_custos_diretos: number | null
        }
        Relationships: []
      }
      vw_equipment_catalog: {
        Row: {
          ativo: boolean | null
          category_id: string | null
          category_nome: string | null
          codigo: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          group_id: string | null
          group_nome: string | null
          hierarquia_path: string | null
          id: string | null
          observacao: string | null
          preco_mensal_ref: number | null
          subcategory_id: string | null
          subcategory_nome: string | null
          tags: string[] | null
          unidade: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equipment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "equipment_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_labor_incidence_by_role: {
        Row: {
          calc_tipo:
            | Database["public"]["Enums"]["labor_incidence_calc_tipo"]
            | null
          custo_mensal_pessoa_final: number | null
          group_codigo: string | null
          group_id: string | null
          group_nome: string | null
          group_ordem: number | null
          is_applicable_final: boolean | null
          is_mandatory_final: boolean | null
          item_codigo: string | null
          item_descricao: string | null
          item_id: string | null
          meses_default: number | null
          months_factor_final: number | null
          override_is_applicable: boolean | null
          override_is_mandatory: boolean | null
          override_months_factor: number | null
          override_notes: string | null
          override_qty: number | null
          override_unit_price: number | null
          preco_unitario_default: number | null
          qtd_default: number | null
          qtd_mes_default: number | null
          qtd_mes_final: number | null
          qty_final: number | null
          role_codigo: string | null
          role_id: string | null
          role_nome: string | null
          rule_id: string | null
          unit_price_final: number | null
          valor_mensal_default: number | null
        }
        Relationships: []
      }
      vw_labor_role_incidence_costs: {
        Row: {
          ativo: boolean | null
          calc_tipo:
            | Database["public"]["Enums"]["labor_incidence_calc_tipo"]
            | null
          custo_mensal_por_pessoa: number | null
          group_codigo: string | null
          group_id: string | null
          group_nome: string | null
          group_ordem: number | null
          has_meses_override: boolean | null
          has_preco_override: boolean | null
          has_qtd_mes_override: boolean | null
          has_qtd_override: boolean | null
          has_valor_mensal_override: boolean | null
          id: string | null
          incidence_item_id: string | null
          item_codigo: string | null
          item_descricao: string | null
          labor_role_id: string | null
          meses: number | null
          obrigatorio: boolean | null
          observacao: string | null
          preco_unitario: number | null
          qtd: number | null
          qtd_mes: number | null
          valor_mensal: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_role_incidence_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "labor_incidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_incidence_item_id_fkey"
            columns: ["incidence_item_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_incidence_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_labor_incidence_by_role"
            referencedColumns: ["role_id"]
          },
        ]
      }
      vw_rateio_dia_projeto: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string | null
          cpf: string | null
          custo_projeto_dia: number | null
          data: string | null
          dia_status:
            | Database["public"]["Enums"]["apontamento_dia_status"]
            | null
          horas_projeto_dia: number | null
          horas_total_dia: number | null
          is_overhead: boolean | null
          percentual: number | null
          projeto_id: string | null
          projeto_nome: string | null
          projeto_os: string | null
          projeto_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamento_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamento_item_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      vw_rentabilidade_projeto: {
        Row: {
          a_pagar: number | null
          a_receber: number | null
          cliente_codigo: string | null
          cliente_nome: string | null
          custo_direto_caixa: number | null
          custo_direto_competencia: number | null
          custo_mao_obra: number | null
          custo_medio_hora: number | null
          data_fim_planejada: string | null
          data_fim_real: string | null
          data_inicio_planejada: string | null
          data_inicio_real: string | null
          desvio_horas: number | null
          desvio_horas_pct: number | null
          empresa_id: string | null
          horas_previstas: number | null
          horas_totais: number | null
          margem_caixa_pct: number | null
          margem_competencia_pct: number | null
          omie_codigo: number | null
          pendencias_abertas: number | null
          projeto_id: string | null
          projeto_nome: string | null
          projeto_os: string | null
          receita_caixa: number | null
          receita_competencia: number | null
          receita_por_hora: number | null
          registros_sem_custo: number | null
          resultado_competencia: number | null
          saldo_caixa: number | null
          status_margem: string | null
          status_projeto: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos: boolean | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          titulos_atrasados_ap: number | null
          titulos_atrasados_ar: number | null
          valor_aditivos_previsto: number | null
          valor_contrato: number | null
          valor_total_contrato: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_secullum_base_dia: {
        Row: {
          colaborador_id: string | null
          data: string | null
          falta_horas: number | null
          fonte: string | null
          horas_extra100: number | null
          horas_extra50: number | null
          horas_normal: number | null
          warning_sem_custo: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_horas_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_secullum_base_por_tipo: {
        Row: {
          colaborador_id: string | null
          data: string | null
          horas: number | null
          tipo_hora: Database["public"]["Enums"]["tipo_hora_ext"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_budget_labor_hh_custo: {
        Args: {
          p_beneficios_mensal: number
          p_carga_horaria_mensal: number
          p_insalubridade_pct: number
          p_periculosidade_pct: number
          p_salario_base: number
          p_total_encargos_pct: number
        }
        Returns: number
      }
      can_approve_projects: { Args: { _user_id: string }; Returns: boolean }
      can_manage_catalogs: { Args: { user_id: string }; Returns: boolean }
      generate_next_budget_number: { Args: never; Returns: string }
      generate_next_os: { Args: never; Returns: string }
      get_alocacao_por_data: {
        Args: {
          p_colaborador_id: string
          p_data: string
          p_tipo?: Database["public"]["Enums"]["alocacao_tipo"]
        }
        Returns: {
          id: string
          projeto_codigo: string
          projeto_id: string
          projeto_nome: string
        }[]
      }
      get_custo_vigente: {
        Args: { p_colaborador_id: string; p_data_referencia?: string }
        Returns: {
          adicional_periculosidade: number
          beneficios: number
          classificacao: string
          colaborador_id: string
          custo_hora: number
          custo_mensal_total: number
          fim_vigencia: string
          id: string
          inicio_vigencia: string
          motivo_alteracao: string
          observacao: string
          periculosidade: boolean
          salario_base: number
        }[]
      }
      get_effective_material_price: {
        Args: {
          p_catalog_id: string
          p_empresa_id?: string
          p_fabricante_id?: string
          p_regiao_id?: string
        }
        Returns: {
          fabricante_id: string
          origem: string
          preco: number
          pricebook_id: string
          pricebook_nome: string
        }[]
      }
      get_effective_mo_price: {
        Args: {
          p_empresa_id?: string
          p_funcao_id: string
          p_regiao_id?: string
        }
        Returns: {
          hh_custo: number
          origem: string
          pricebook_id: string
          pricebook_nome: string
          produtividade_tipo: Database["public"]["Enums"]["budget_productivity_type"]
          produtividade_unidade: string
          produtividade_valor: number
        }[]
      }
      get_incidence_effective_price: {
        Args: { p_empresa_id?: string; p_item_id: string; p_regiao_id?: string }
        Returns: number
      }
      get_labor_role_incidence_totals: {
        Args: { p_labor_role_id: string }
        Returns: {
          group_codigo: string
          group_nome: string
          total_geral: number
          total_grupo: number
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_catalog_manager: { Args: never; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      obter_custo_vigente: {
        Args: {
          p_colaborador_id: string
          p_data: string
          p_horas_100?: number
          p_horas_50?: number
          p_horas_normais?: number
        }
        Returns: {
          beneficios: number
          classificacao: string
          colaborador_id: string
          custo_hora_homem: number
          custo_id: string
          custo_mensal_total: number
          encargos: number
          fgts_t: number
          horas_totais: number
          periculosidade_valor: number
          prov_13: number
          prov_ferias: number
          prov_rescisao: number
          provisoes_t: number
          salario_base: number
          salario_t: number
        }[]
      }
    }
    Enums: {
      alocacao_tipo: "planejado" | "realizado"
      apontamento_dia_status: "RASCUNHO" | "ENVIADO" | "APROVADO" | "BLOQUEADO" | "PENDENTE" | "DIVERGENTE" | "CONCILIADO"
      apontamento_fonte_base: "PONTO" | "JORNADA" | "MANUAL" | "SECULLUM"
      apontamento_origem: "IMPORTACAO" | "MANUAL" | "SISTEMA"
      apontamento_status:
        | "PENDENTE"
        | "LANCADO"
        | "APROVADO"
        | "REPROVADO"
        | "NAO_LANCADO"
      app_role:
        | "admin"
        | "rh"
        | "financeiro"
        | "super_admin"
        | "catalog_manager"
      aprovacao_status:
        | "RASCUNHO"
        | "PENDENTE_APROVACAO"
        | "APROVADO"
        | "REPROVADO"
      budget_labor_regime: "CLT" | "PL"
      budget_labor_type: "MOD" | "MOI"
      budget_productivity_type: "HH_POR_UN" | "UN_POR_HH"
      custo_status: "OK" | "SEM_CUSTO"
      employee_status: "ativo" | "afastado" | "desligado"
      empresa_status: "ativo" | "inativo"
      eng_type: "HH" | "FECHADO"
      gen_status: "PENDENTE" | "APLICADO"
      hh_origin: "MATERIAIS" | "MANUAL"
      integracao_status: "OK" | "ERRO" | "PENDENTE"
      labor_incidence_calc_tipo: "RATEIO_MESES" | "MENSAL"
      labor_modality: "CLT" | "PACOTE"
      nivel_risco: "BAIXO" | "MEDIO" | "ALTO"
      pendencia_origem: "OMIE_AR" | "OMIE_AP" | "HORAS"
      pendencia_status: "ABERTA" | "RESOLVIDA" | "IGNORADA"
      pendencia_tipo:
        | "SEM_PROJETO"
        | "PROJETO_INEXISTENTE"
        | "SEM_CATEGORIA"
        | "APONTAMENTO_SEM_CUSTO"
        | "OUTRO"
      pricebook_type: "MATERIAIS" | "MO"
      regiao_colaborador: "Campos Gerais" | "Paranaguá"
      revision_status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CANCELED"
      status_projeto: "ATIVO" | "CONCLUIDO" | "SUSPENSO" | "CANCELADO"
      supply_type: "CONCEPT" | "CLIENTE" | "TERCEIRO" | "A_DEFINIR"
      sync_status: "INICIADO" | "SUCESSO" | "ERRO" | "PARCIAL"
      sync_tipo: "CONTAS_RECEBER" | "CONTAS_PAGAR" | "PROJETOS"
      tax_base: "SALE" | "COST"
      tax_scope: "ALL" | "MATERIALS" | "SERVICES"
      tax_value_type: "PERCENT" | "FIXED"
      tipo_contrato: "PRECO_FECHADO" | "MAO_DE_OBRA"
      tipo_hora: "NORMAL" | "H50" | "H100" | "NOTURNA"
      tipo_hora_ext:
        | "NORMAL"
        | "EXTRA50"
        | "EXTRA100"
        | "DESLOCAMENTO"
        | "TREINAMENTO"
        | "ADM"
      titulo_status: "ABERTO" | "PAGO" | "ATRASADO" | "CANCELADO" | "PARCIAL"
      wbs_type: "CHAPTER" | "PACKAGE" | "ACTIVITY"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alocacao_tipo: ["planejado", "realizado"],
      apontamento_dia_status: ["RASCUNHO", "ENVIADO", "APROVADO", "BLOQUEADO", "PENDENTE", "DIVERGENTE", "CONCILIADO"],
      apontamento_fonte_base: ["PONTO", "JORNADA", "MANUAL", "SECULLUM"],
      apontamento_origem: ["IMPORTACAO", "MANUAL", "SISTEMA"],
      apontamento_status: [
        "PENDENTE",
        "LANCADO",
        "APROVADO",
        "REPROVADO",
        "NAO_LANCADO",
      ],
      app_role: ["admin", "rh", "financeiro", "super_admin", "catalog_manager"],
      aprovacao_status: [
        "RASCUNHO",
        "PENDENTE_APROVACAO",
        "APROVADO",
        "REPROVADO",
      ],
      budget_labor_regime: ["CLT", "PL"],
      budget_labor_type: ["MOD", "MOI"],
      budget_productivity_type: ["HH_POR_UN", "UN_POR_HH"],
      custo_status: ["OK", "SEM_CUSTO"],
      employee_status: ["ativo", "afastado", "desligado"],
      empresa_status: ["ativo", "inativo"],
      eng_type: ["HH", "FECHADO"],
      gen_status: ["PENDENTE", "APLICADO"],
      hh_origin: ["MATERIAIS", "MANUAL"],
      integracao_status: ["OK", "ERRO", "PENDENTE"],
      labor_incidence_calc_tipo: ["RATEIO_MESES", "MENSAL"],
      labor_modality: ["CLT", "PACOTE"],
      nivel_risco: ["BAIXO", "MEDIO", "ALTO"],
      pendencia_origem: ["OMIE_AR", "OMIE_AP", "HORAS"],
      pendencia_status: ["ABERTA", "RESOLVIDA", "IGNORADA"],
      pendencia_tipo: [
        "SEM_PROJETO",
        "PROJETO_INEXISTENTE",
        "SEM_CATEGORIA",
        "APONTAMENTO_SEM_CUSTO",
        "OUTRO",
      ],
      pricebook_type: ["MATERIAIS", "MO"],
      regiao_colaborador: ["Campos Gerais", "Paranaguá"],
      revision_status: ["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELED"],
      status_projeto: ["ATIVO", "CONCLUIDO", "SUSPENSO", "CANCELADO"],
      supply_type: ["CONCEPT", "CLIENTE", "TERCEIRO", "A_DEFINIR"],
      sync_status: ["INICIADO", "SUCESSO", "ERRO", "PARCIAL"],
      sync_tipo: ["CONTAS_RECEBER", "CONTAS_PAGAR", "PROJETOS"],
      tax_base: ["SALE", "COST"],
      tax_scope: ["ALL", "MATERIALS", "SERVICES"],
      tax_value_type: ["PERCENT", "FIXED"],
      tipo_contrato: ["PRECO_FECHADO", "MAO_DE_OBRA"],
      tipo_hora: ["NORMAL", "H50", "H100", "NOTURNA"],
      tipo_hora_ext: [
        "NORMAL",
        "EXTRA50",
        "EXTRA100",
        "DESLOCAMENTO",
        "TREINAMENTO",
        "ADM",
      ],
      titulo_status: ["ABERTO", "PAGO", "ATRASADO", "CANCELADO", "PARCIAL"],
      wbs_type: ["CHAPTER", "PACKAGE", "ACTIVITY"],
    },
  },
} as const
