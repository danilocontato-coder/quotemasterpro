import { supabase } from '@/integrations/supabase/client';

export interface ApprovalLevelData {
  client_id: string;
  name: string;
  amount_threshold: number;
  max_amount_threshold: number | null;
  order_level: number;
  approvers: string[];
  active: boolean;
}

export class CondominioApprovalService {
  /**
   * Criar níveis de aprovação padrão para um condomínio
   */
  static async createDefaultApprovalLevels(condominioId: string): Promise<void> {
    console.log('🎯 [CondominioApprovalService] Criando níveis padrão para:', condominioId);

    const defaultLevels: Omit<ApprovalLevelData, 'client_id' | 'approvers'>[] = [
      {
        name: 'Nível 1 - Básico',
        amount_threshold: 0,
        max_amount_threshold: 1000,
        order_level: 1,
        active: true
      },
      {
        name: 'Nível 2 - Intermediário',
        amount_threshold: 1001,
        max_amount_threshold: 5000,
        order_level: 2,
        active: true
      },
      {
        name: 'Nível 3 - Alto',
        amount_threshold: 5001,
        max_amount_threshold: 20000,
        order_level: 3,
        active: true
      },
      {
        name: 'Nível 4 - Crítico',
        amount_threshold: 20001,
        max_amount_threshold: null,
        order_level: 4,
        active: true
      }
    ];

    try {
      const levelsToInsert = defaultLevels.map(level => ({
        client_id: condominioId,
        name: level.name,
        amount_threshold: level.amount_threshold,
        max_amount_threshold: level.max_amount_threshold,
        order_level: level.order_level,
        approvers: [], // Vazio - condomínio precisa configurar
        active: true
      }));

      const { error } = await supabase
        .from('approval_levels')
        .insert(levelsToInsert);

      if (error) throw error;

      console.log('✅ [CondominioApprovalService] Níveis padrão criados com sucesso');
    } catch (error) {
      console.error('❌ [CondominioApprovalService] Erro ao criar níveis padrão:', error);
      throw error;
    }
  }

  /**
   * Copiar níveis de aprovação da administradora para o condomínio
   */
  static async copyApprovalLevelsFromAdministradora(
    condominioId: string,
    administradoraId: string
  ): Promise<void> {
    console.log('📋 [CondominioApprovalService] Copiando níveis da administradora:', {
      from: administradoraId,
      to: condominioId
    });

    try {
      // Buscar níveis da administradora
      const { data: adminLevels, error: fetchError } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', administradoraId)
        .eq('active', true)
        .order('order_level', { ascending: true });

      if (fetchError) throw fetchError;

      if (!adminLevels || adminLevels.length === 0) {
        console.log('⚠️ [CondominioApprovalService] Administradora não tem níveis configurados, criando padrão');
        await this.createDefaultApprovalLevels(condominioId);
        return;
      }

      // Criar níveis para o condomínio (sem os aprovadores)
      const levelsToInsert = adminLevels.map(level => ({
        client_id: condominioId,
        name: level.name,
        amount_threshold: level.amount_threshold,
        max_amount_threshold: level.max_amount_threshold,
        order_level: level.order_level,
        approvers: [], // Vazio - condomínio precisa configurar seus aprovadores
        active: true
      }));

      const { error: insertError } = await supabase
        .from('approval_levels')
        .insert(levelsToInsert);

      if (insertError) throw insertError;

      console.log('✅ [CondominioApprovalService] Níveis copiados com sucesso:', levelsToInsert.length);
    } catch (error) {
      console.error('❌ [CondominioApprovalService] Erro ao copiar níveis:', error);
      throw error;
    }
  }

  /**
   * Validar se condomínio tem níveis de aprovação configurados
   */
  static async validateApprovalLevelsExist(condominioId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('approval_levels')
        .select('id')
        .eq('client_id', condominioId)
        .eq('active', true)
        .limit(1);

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ [CondominioApprovalService] Erro ao validar níveis:', error);
      return false;
    }
  }

  /**
   * Buscar todos os níveis de aprovação de um condomínio
   */
  static async getCondominioApprovalLevels(condominioId: string) {
    try {
      const { data, error } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', condominioId)
        .eq('active', true)
        .order('order_level', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ [CondominioApprovalService] Erro ao buscar níveis:', error);
      return [];
    }
  }

  /**
   * Validar se condomínio tem aprovadores configurados
   */
  static async validateApproversConfigured(condominioId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('approval_levels')
        .select('approvers')
        .eq('client_id', condominioId)
        .eq('active', true);

      if (error) throw error;

      // Verificar se ao menos um nível tem aprovadores
      return data?.some(level => level.approvers && level.approvers.length > 0) || false;
    } catch (error) {
      console.error('❌ [CondominioApprovalService] Erro ao validar aprovadores:', error);
      return false;
    }
  }
}
