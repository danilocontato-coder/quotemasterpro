import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Truck, Shield, CreditCard, HelpCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { FeatureCard, FeatureCardGrid } from "./FeatureCard";
import { ClientPurchaseFlowDiagram, SupplierSaleFlowDiagram } from "./FlowDiagram";

interface HowItWorksHelpProps {
  searchQuery?: string;
}

export function HowItWorksHelp({ searchQuery }: HowItWorksHelpProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="client" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="client" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Para Clientes
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Para Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="space-y-6">
          <ClientProcessGuide searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="supplier" className="space-y-6">
          <SupplierProcessGuide searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientProcessGuide({ searchQuery }: { searchQuery?: string }) {
  return (
    <div className="space-y-8">
      {/* Fluxo Visual */}
      <ClientPurchaseFlowDiagram 
        title="Jornada de Compra" 
        description="Acompanhe cada etapa do processo de cotação até o recebimento"
      />

      {/* Seção de Segurança */}
      <Alert className="border-green-500/50 bg-green-500/10">
        <Shield className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">Pagamento Protegido</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">
          Seu dinheiro fica em custódia até você confirmar o recebimento. 
          Só liberamos o pagamento ao fornecedor após sua confirmação com código de 6 dígitos.
        </AlertDescription>
      </Alert>

      {/* Etapas Detalhadas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Passo a Passo Detalhado
        </h3>
        
        <FeatureCardGrid columns={2}>
          <FeatureCard
            icon="📝"
            title="1. Criar Cotação"
            description="Descreva o que você precisa: título, descrição detalhada, itens com quantidades e especificações. Anexe documentos se necessário."
            location="Cotações → Nova Cotação"
            tip="Quanto mais detalhes você fornecer, melhores propostas receberá dos fornecedores."
          />
          <FeatureCard
            icon="🏢"
            title="2. Selecionar Fornecedores"
            description="Escolha quais fornecedores receberão sua cotação. O sistema sugere automaticamente com base nas categorias dos itens."
            location="Ao criar cotação → Selecionar Fornecedores"
          />
          <FeatureCard
            icon="📥"
            title="3. Receber Propostas"
            description="Os fornecedores selecionados recebem sua cotação e enviam propostas com preços, prazos e condições. Você é notificado em tempo real."
            tip="Acompanhe as notificações para ver quando novas propostas chegam."
          />
          <FeatureCard
            icon="📊"
            title="4. Comparar e Analisar"
            description="Use a Matriz de Decisão para comparar propostas lado a lado. O sistema calcula automaticamente um ranking baseado em preço, prazo, garantia e outros critérios."
            location="Cotação → Propostas Recebidas → Matriz de Decisão"
            tip="A IA pode analisar as propostas e recomendar a melhor opção."
          />
          <FeatureCard
            icon="✅"
            title="5. Aprovar Proposta"
            description="Escolha a melhor proposta e aprove. Se sua empresa tem níveis de aprovação configurados, a cotação segue para os aprovadores necessários."
            location="Proposta → Aprovar"
          />
          <FeatureCard
            icon="💳"
            title="6. Pagar com Segurança"
            description="Efetue o pagamento via PIX. O valor fica em custódia (escrow) - você tem garantia de que só será liberado após confirmar o recebimento."
            location="Cotação Aprovada → Efetuar Pagamento"
            tip="O fornecedor só recebe após você confirmar a entrega."
          />
          <FeatureCard
            icon="🚚"
            title="7. Acompanhar Entrega"
            description="O fornecedor agenda a entrega e você acompanha o status em tempo real. Receba notificações sobre cada atualização."
            location="Entregas → Acompanhar"
          />
          <FeatureCard
            icon="✔️"
            title="8. Confirmar Recebimento"
            description="Ao receber o pedido, use o código de 6 dígitos para confirmar. Isso libera automaticamente o pagamento ao fornecedor."
            location="Entregas → Confirmar Recebimento"
            tip="Verifique os itens antes de confirmar. Em caso de problemas, entre em contato antes de confirmar."
          />
        </FeatureCardGrid>
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">E se o fornecedor não entregar?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Seu dinheiro está protegido. Como o pagamento fica em custódia, ele só é liberado após sua confirmação de recebimento. 
              Se houver problemas, nossa equipe pode mediar a situação.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Posso cancelar uma cotação?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Sim, você pode cancelar cotações que ainda não foram pagas. Após o pagamento, entre em contato com o suporte 
              para verificar a possibilidade de cancelamento com estorno.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Como funciona a aprovação por níveis?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Se sua empresa tem níveis de aprovação configurados, cotações acima de determinados valores precisam ser aprovadas 
              por gestores ou diretores antes de seguir para pagamento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierProcessGuide({ searchQuery }: { searchQuery?: string }) {
  return (
    <div className="space-y-8">
      {/* Fluxo Visual */}
      <SupplierSaleFlowDiagram 
        title="Jornada de Venda" 
        description="Do recebimento da cotação até o recebimento do pagamento"
      />

      {/* Seção de Recebimentos */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <CreditCard className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-700 dark:text-blue-400">Como Você Recebe</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-300">
          Cliente paga via PIX → Valor fica em custódia → Você entrega → Cliente confirma → 
          Transferência automática para sua conta. Comissão: apenas 5% do valor da venda.
        </AlertDescription>
      </Alert>

      {/* Etapas Detalhadas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Passo a Passo Detalhado
        </h3>
        
        <FeatureCardGrid columns={2}>
          <FeatureCard
            icon="📩"
            title="1. Receber Cotação"
            description="Você recebe cotações via e-mail, WhatsApp ou diretamente na plataforma. Cada cotação contém os itens que o cliente precisa."
            tip="Responda rapidamente para aumentar suas chances de ser escolhido."
          />
          <FeatureCard
            icon="📋"
            title="2. Analisar Pedido"
            description="Revise os itens solicitados, quantidades e especificações. Verifique se você pode atender à demanda."
            location="Cotações Recebidas → Ver Detalhes"
          />
          <FeatureCard
            icon="💰"
            title="3. Enviar Proposta"
            description="Preencha sua proposta com preços por item, valor do frete, prazo de entrega e condições de pagamento. Você também pode enviar um PDF da sua proposta comercial."
            location="Cotação → Responder"
            tip="Propostas completas e competitivas têm mais chances de aprovação."
          />
          <FeatureCard
            icon="⏳"
            title="4. Aguardar Decisão"
            description="O cliente analisa todas as propostas recebidas usando nossa Matriz de Decisão. Você pode acompanhar o status da sua proposta."
            location="Minhas Propostas → Status"
          />
          <FeatureCard
            icon="✅"
            title="5. Proposta Aprovada!"
            description="Parabéns! Quando sua proposta é escolhida, você recebe uma notificação. O cliente agora pode efetuar o pagamento."
            tip="Após aprovação, prepare-se para a entrega."
          />
          <FeatureCard
            icon="📄"
            title="6. Emitir Cobrança"
            description="Quando o cliente estiver pronto para pagar, gere a cobrança PIX diretamente na plataforma. O sistema calcula automaticamente os valores."
            location="Cotação Aprovada → Emitir Cobrança"
          />
          <FeatureCard
            icon="🚚"
            title="7. Agendar e Entregar"
            description="Após o cliente pagar, agende a entrega informando data, horário e detalhes do transporte. Realize a entrega no prazo combinado."
            location="Entregas → Agendar"
            tip="Entregas pontuais melhoram sua reputação na plataforma."
          />
          <FeatureCard
            icon="💵"
            title="8. Receber Pagamento"
            description="Quando o cliente confirmar o recebimento, o valor é transferido automaticamente para sua conta bancária cadastrada, já descontada a comissão de 5%."
            location="Recebíveis → Histórico"
          />
        </FeatureCardGrid>
      </div>

      {/* Informação sobre Comissão */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Clock className="h-5 w-5" />
            Sobre Valores e Comissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium text-foreground">Valor da Venda:</span>
            <span className="text-muted-foreground">O preço que você definiu para os produtos/serviços</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-foreground">Comissão:</span>
            <span className="text-muted-foreground">5% sobre o valor da venda (descontado automaticamente)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-foreground">Valor Líquido:</span>
            <span className="text-muted-foreground">O que você efetivamente recebe na sua conta</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-foreground">Prazo:</span>
            <span className="text-muted-foreground">Transferência automática após confirmação de recebimento pelo cliente</span>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">E se o cliente não confirmar a entrega?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Após um período sem confirmação, nossa equipe entra em contato com o cliente para verificar. 
              Você pode entrar em contato conosco para agilizar a resolução.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Posso responder cotações via WhatsApp?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Sim! Nosso sistema permite que você aceite ou recuse cotações diretamente pelo WhatsApp. 
              Para enviar propostas detalhadas, use o link que enviamos para você.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Como cadastro meus dados bancários?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse Configurações → Dados Bancários e cadastre sua chave PIX ou dados da conta. 
              É necessário ter os dados cadastrados para receber pagamentos.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Como funciona a comissão?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              A plataforma cobra 5% sobre o valor base da venda. O frete não entra no cálculo da comissão. 
              O desconto é automático na hora da transferência para sua conta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aviso sobre Dados Bancários */}
      <Alert variant="default" className="border-amber-500/50">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Importante</AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          Para receber pagamentos, você precisa ter seus dados bancários (chave PIX ou conta) cadastrados. 
          Acesse Configurações → Dados Bancários para verificar.
        </AlertDescription>
      </Alert>
    </div>
  );
}
