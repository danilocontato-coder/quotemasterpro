/**
 * HELPERS DE TESTE - Sistema de Cotações
 * Funções auxiliares para facilitar testes manuais e automatizados
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// 1. VERIFICAÇÃO DE ISOLAMENTO DE DADOS
// ============================================================================

/**
 * Verifica se o usuário atual só tem acesso aos dados do seu cliente
 */
export async function testDataIsolation() {
  console.log('🧪 Iniciando teste de isolamento de dados...');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Nenhum usuário autenticado');
    return false;
  }

  // Buscar client_id do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, role')
    .eq('id', user.id)
    .single();

  console.log('👤 Usuário:', { id: user.id, role: profile?.role, client_id: profile?.client_id });

  // Testar acesso a cotações
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, client_id, title');

  if (quotesError) {
    console.error('❌ Erro ao buscar cotações:', quotesError);
    return false;
  }

  // Verificar se TODAS as cotações pertencem ao cliente correto
  const allBelongToClient = quotes?.every(q => q.client_id === profile?.client_id);
  
  if (allBelongToClient) {
    console.log('✅ PASSOU: Todas as cotações pertencem ao cliente correto');
  } else {
    console.error('❌ FALHOU: Cotações de outros clientes foram retornadas!');
    console.table(quotes);
    return false;
  }

  // Testar acesso a produtos
  const { data: products } = await supabase
    .from('products')
    .select('id, client_id, supplier_id, name');

  const validProducts = products?.every(p => 
    p.client_id === profile?.client_id || 
    (profile?.role === 'supplier' && p.supplier_id)
  );

  if (validProducts) {
    console.log('✅ PASSOU: Produtos corretamente isolados');
  } else {
    console.error('❌ FALHOU: Produtos de outros clientes/fornecedores foram retornados!');
    console.table(products);
    return false;
  }

  console.log('✅ TESTE DE ISOLAMENTO: SUCESSO');
  return true;
}

// ============================================================================
// 2. VERIFICAÇÃO DE PERMISSÕES RLS
// ============================================================================

/**
 * Tenta acessar dados de outro cliente (deve falhar)
 */
export async function testRLSProtection() {
  console.log('🧪 Testando proteção RLS...');

  // Buscar uma cotação qualquer
  const { data: firstQuote } = await supabase
    .from('quotes')
    .select('id, client_id')
    .limit(1)
    .single();

  if (!firstQuote) {
    console.warn('⚠️ Nenhuma cotação para testar');
    return true;
  }

  console.log('📝 Tentando modificar cotação:', firstQuote.id);

  // Tentar modificar com client_id diferente (deve falhar)
  const fakeClientId = '00000000-0000-0000-0000-000000000000';
  const { error } = await supabase
    .from('quotes')
    .update({ title: 'TESTE DE INVASÃO' })
    .eq('id', firstQuote.id)
    .eq('client_id', fakeClientId); // Tentativa de burlar RLS

  if (error) {
    console.log('✅ PASSOU: RLS bloqueou tentativa de modificação não autorizada');
    return true;
  } else {
    console.error('❌ FALHOU: RLS NÃO bloqueou modificação não autorizada! VULNERABILIDADE!');
    return false;
  }
}

// ============================================================================
// 3. TESTE DE PERFORMANCE
// ============================================================================

/**
 * Mede tempo de carregamento de queries importantes
 */
export async function testPerformance() {
  console.log('🧪 Testando performance...');
  const results: Record<string, number> = {};

  // Teste 1: Carregar dashboard
  const start1 = performance.now();
  await supabase.from('quotes').select('*').limit(10);
  results['Dashboard (10 cotações)'] = performance.now() - start1;

  // Teste 2: Carregar fornecedores
  const start2 = performance.now();
  await supabase.from('suppliers').select('*').limit(50);
  results['Lista de fornecedores'] = performance.now() - start2;

  // Teste 3: Carregar produtos
  const start3 = performance.now();
  await supabase.from('products').select('*').limit(50);
  results['Lista de produtos'] = performance.now() - start3;

  console.table(results);

  // Verificar se alguma query está muito lenta (> 3 segundos)
  const slowQueries = Object.entries(results).filter(([_, time]) => time > 3000);
  
  if (slowQueries.length > 0) {
    console.warn('⚠️ Queries lentas detectadas:', slowQueries);
    return false;
  }

  console.log('✅ PERFORMANCE: Todas as queries em tempo aceitável');
  return true;
}

// ============================================================================
// 4. TESTE DE NOTIFICAÇÕES
// ============================================================================

/**
 * Verifica se notificações estão funcionando
 */
export async function testNotifications() {
  console.log('🧪 Testando sistema de notificações...');

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    return false;
  }

  console.log('📬 Últimas notificações:');
  console.table(notifications);

  // Verificar se realtime está ativo
  const channel = supabase
    .channel('test-notifications')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        console.log('✅ Realtime funcionando:', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Status do canal realtime:', status);
    });

  // Desinscrever após 2 segundos
  setTimeout(() => {
    channel.unsubscribe();
    console.log('🔌 Canal realtime desconectado');
  }, 2000);

  return true;
}

// ============================================================================
// 5. TESTE DE AUTENTICAÇÃO
// ============================================================================

/**
 * Verifica estado de autenticação e perfil do usuário
 */
export async function testAuthentication() {
  console.log('🧪 Testando autenticação...');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ Sessão inválida ou expirada');
    return false;
  }

  console.log('✅ Sessão ativa:', {
    user_id: session.user.id,
    email: session.user.email,
    expires_at: new Date(session.expires_at! * 1000).toLocaleString()
  });

  // Verificar perfil do usuário
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    console.error('❌ Perfil não encontrado');
    return false;
  }

  console.log('👤 Perfil do usuário:');
  console.table(profile);

  return true;
}

// ============================================================================
// 6. TESTE DE INTEGRIDADE DE DADOS
// ============================================================================

/**
 * Verifica se não há dados órfãos ou inconsistentes
 */
export async function testDataIntegrity() {
  console.log('🧪 Testando integridade de dados...');

  // Verificar cotações sem itens
  const { data: quotesWithoutItems } = await supabase
    .from('quotes')
    .select(`
      id, 
      title,
      items:quote_items(count)
    `)
    .eq('status', 'draft');

  const emptyQuotes = quotesWithoutItems?.filter(q => 
    !q.items || (q.items as any)[0]?.count === 0
  );

  if (emptyQuotes && emptyQuotes.length > 0) {
    console.warn('⚠️ Cotações sem itens encontradas:', emptyQuotes.length);
  }

  // Verificar produtos sem fornecedor ou cliente
  const { data: orphanProducts } = await supabase
    .from('products')
    .select('id, name, client_id, supplier_id')
    .is('client_id', null)
    .is('supplier_id', null);

  if (orphanProducts && orphanProducts.length > 0) {
    console.warn('⚠️ Produtos órfãos encontrados:', orphanProducts.length);
    console.table(orphanProducts);
  }

  // Verificar usuários sem cliente/fornecedor
  const { data: orphanUsers } = await supabase
    .from('profiles')
    .select('id, email, client_id, supplier_id, role')
    .is('client_id', null)
    .is('supplier_id', null)
    .neq('role', 'admin');

  if (orphanUsers && orphanUsers.length > 0) {
    console.warn('⚠️ Usuários órfãos encontrados:', orphanUsers.length);
    console.table(orphanUsers);
  }

  console.log('✅ INTEGRIDADE: Verificação concluída');
  return true;
}

// ============================================================================
// 7. EXECUTAR TODOS OS TESTES
// ============================================================================

/**
 * Executa toda a suíte de testes
 */
export async function runAllTests() {
  console.log('🚀 ========================================');
  console.log('🚀 EXECUTANDO SUÍTE COMPLETA DE TESTES');
  console.log('🚀 ========================================\n');

  const results = {
    authentication: await testAuthentication(),
    dataIsolation: await testDataIsolation(),
    rlsProtection: await testRLSProtection(),
    performance: await testPerformance(),
    notifications: await testNotifications(),
    dataIntegrity: await testDataIntegrity()
  };

  console.log('\n📊 ========================================');
  console.log('📊 RESULTADO FINAL DOS TESTES');
  console.log('📊 ========================================\n');
  console.table(results);

  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM! Sistema pronto para clientes de teste.');
  } else {
    console.error('❌ ALGUNS TESTES FALHARAM. Revise os logs acima.');
  }

  return results;
}

// ============================================================================
// 8. HELPERS PARA CONSOLE
// ============================================================================

/**
 * Expor funções globalmente no console para facilitar testes manuais
 */
if (typeof window !== 'undefined') {
  (window as any).testHelpers = {
    runAll: runAllTests,
    testAuth: testAuthentication,
    testIsolation: testDataIsolation,
    testRLS: testRLSProtection,
    testPerf: testPerformance,
    testNotif: testNotifications,
    testIntegrity: testDataIntegrity,
    
    // Comando rápido
    help: () => {
      console.log(`
🧪 HELPERS DE TESTE DISPONÍVEIS:

Para testar no Console (F12):
-------------------------------
testHelpers.runAll()        - Executa TODOS os testes
testHelpers.testAuth()      - Testa autenticação
testHelpers.testIsolation() - Testa isolamento de dados
testHelpers.testRLS()       - Testa proteção RLS
testHelpers.testPerf()      - Testa performance
testHelpers.testNotif()     - Testa notificações
testHelpers.testIntegrity() - Testa integridade dos dados

Exemplo de uso:
await testHelpers.runAll()
      `);
    }
  };

  console.log('🧪 Test Helpers carregados! Digite "testHelpers.help()" para ver comandos.');
}
