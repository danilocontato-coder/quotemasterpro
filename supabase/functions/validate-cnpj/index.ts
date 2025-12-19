import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface ValidateCNPJRequest {
  cnpj: string;
}

interface CNPJResponse {
  valid: boolean;
  company?: {
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: string;
    data_situacao_cadastral: string;
    cnpj_formatado: string;
    endereco?: {
      logradouro: string;
      numero: string;
      complemento: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
    };
    atividade_principal?: {
      codigo: string;
      descricao: string;
    };
    natureza_juridica?: string;
    capital_social?: number;
  };
  error?: string;
}

// Validação de formato do CNPJ (dígitos verificadores)
function validateCNPJFormat(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  // Validar dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCNPJ[12]) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleanCNPJ[13]) === digit2;
}

// Formatar CNPJ
function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj }: ValidateCNPJRequest = await req.json();

    if (!cnpj) {
      return new Response(
        JSON.stringify({ valid: false, error: 'CNPJ é obrigatório' } as CNPJResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCNPJ = cnpj.replace(/\D/g, '');

    // Validar formato local primeiro
    if (!validateCNPJFormat(cleanCNPJ)) {
      console.log(`❌ CNPJ ${cnpj} inválido (formato)`);
      return new Response(
        JSON.stringify({ valid: false, error: 'CNPJ inválido. Verifique os dígitos.' } as CNPJResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Consultar API BrasilAPI (alternativa gratuita e confiável)
    console.log(`🔍 Consultando CNPJ ${cleanCNPJ} na API...`);
    
    const apiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!apiResponse.ok) {
      // Tentar API alternativa (ReceitaWS)
      console.log('⚠️ BrasilAPI falhou, tentando ReceitaWS...');
      
      const receitaResponse = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!receitaResponse.ok) {
        if (apiResponse.status === 404 || receitaResponse.status === 404) {
          return new Response(
            JSON.stringify({ valid: false, error: 'CNPJ não encontrado na Receita Federal' } as CNPJResponse),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Erro ao consultar APIs de CNPJ');
      }

      // Processar resposta ReceitaWS
      const receitaData = await receitaResponse.json();
      
      if (receitaData.status === 'ERROR') {
        return new Response(
          JSON.stringify({ valid: false, error: receitaData.message || 'CNPJ não encontrado' } as CNPJResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isActive = receitaData.situacao?.toUpperCase() === 'ATIVA';
      
      const response: CNPJResponse = {
        valid: isActive,
        company: {
          razao_social: receitaData.nome || '',
          nome_fantasia: receitaData.fantasia || receitaData.nome || '',
          situacao_cadastral: receitaData.situacao || 'Desconhecida',
          data_situacao_cadastral: receitaData.data_situacao || '',
          cnpj_formatado: formatCNPJ(cleanCNPJ),
          endereco: {
            logradouro: receitaData.logradouro || '',
            numero: receitaData.numero || '',
            complemento: receitaData.complemento || '',
            bairro: receitaData.bairro || '',
            municipio: receitaData.municipio || '',
            uf: receitaData.uf || '',
            cep: receitaData.cep || ''
          },
          atividade_principal: receitaData.atividade_principal?.[0] ? {
            codigo: receitaData.atividade_principal[0].code || '',
            descricao: receitaData.atividade_principal[0].text || ''
          } : undefined,
          natureza_juridica: receitaData.natureza_juridica || '',
          capital_social: receitaData.capital_social ? parseFloat(receitaData.capital_social) : undefined
        },
        error: isActive ? undefined : `Situação cadastral: ${receitaData.situacao}. Apenas empresas ATIVAS podem se cadastrar.`
      };

      console.log(`✅ CNPJ consultado via ReceitaWS: ${response.company?.razao_social} - ${response.company?.situacao_cadastral}`);

      return new Response(
        JSON.stringify(response),
        { 
          status: isActive ? 200 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Processar resposta BrasilAPI
    const data = await apiResponse.json();
    
    const situacao = data.descricao_situacao_cadastral || 'Desconhecida';
    const isActive = situacao.toUpperCase() === 'ATIVA';

    const response: CNPJResponse = {
      valid: isActive,
      company: {
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || data.razao_social || '',
        situacao_cadastral: situacao,
        data_situacao_cadastral: data.data_situacao_cadastral || '',
        cnpj_formatado: formatCNPJ(cleanCNPJ),
        endereco: {
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          municipio: data.municipio || '',
          uf: data.uf || '',
          cep: data.cep || ''
        },
        atividade_principal: data.cnae_fiscal_descricao ? {
          codigo: String(data.cnae_fiscal || ''),
          descricao: data.cnae_fiscal_descricao
        } : undefined,
        natureza_juridica: data.natureza_juridica || '',
        capital_social: data.capital_social
      },
      error: isActive ? undefined : `Situação cadastral: ${situacao}. Apenas empresas ATIVAS podem se cadastrar.`
    };

    console.log(`✅ CNPJ consultado via BrasilAPI: ${response.company?.razao_social} - ${situacao}`);

    return new Response(
      JSON.stringify(response),
      { 
        status: isActive ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro em validate-cnpj:', error);
    
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro ao consultar CNPJ. Tente novamente.' } as CNPJResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
