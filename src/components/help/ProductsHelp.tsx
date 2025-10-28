import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Package, Search, Upload, Download, Tag, BarChart3 } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function ProductsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Produtos permite gerenciar o catálogo de produtos e serviços utilizados em cotações, facilitando a padronização e rastreabilidade.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Como Cadastrar Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Siga estes passos para cadastrar um novo produto no sistema:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Acesse o módulo:</strong> Clique em "Produtos" no menu lateral</li>
            <li><strong>Criar novo produto:</strong> Clique no botão "Novo Produto" no canto superior direito</li>
            <li><strong>Preencher informações básicas:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Código do produto (identificação única)</li>
                <li>Descrição detalhada do produto</li>
                <li>Categoria (para organização)</li>
                <li>Unidade de medida (unidade, caixa, kg, litro, etc.)</li>
              </ul>
            </li>
            <li><strong>Adicionar especificações técnicas:</strong> Inclua detalhes relevantes como marca, modelo, dimensões</li>
            <li><strong>Vincular fornecedores (opcional):</strong> Associe fornecedores que fornecem este produto</li>
            <li><strong>Salvar:</strong> Clique em "Salvar" para adicionar o produto ao catálogo</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Automática por Código de Barras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O sistema oferece integração com APIs de produtos para facilitar o cadastro:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Digite ou escaneie o código de barras do produto</li>
            <li>O sistema busca automaticamente informações como nome, marca e categoria</li>
            <li>Os dados são preenchidos automaticamente no formulário</li>
            <li>Você pode revisar e ajustar as informações antes de salvar</li>
          </ul>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta funcionalidade economiza tempo e reduz erros de digitação no cadastro de produtos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciamento de Catálogo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ferramentas para gerenciar seu catálogo de produtos:
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Buscar e Filtrar</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Use a barra de busca para encontrar produtos por código ou descrição</li>
                <li>Filtre por categoria, fornecedor ou status</li>
                <li>Ordene por nome, código ou data de cadastro</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Editar e Desativar</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Clique no produto para editar informações</li>
                <li>Desative produtos que não são mais utilizados (sem excluí-los do histórico)</li>
                <li>Reative produtos quando necessário</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar em Lote
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Baixe o modelo de planilha (CSV ou Excel)</li>
                <li>Preencha com os dados dos produtos</li>
                <li>Importe o arquivo para cadastrar múltiplos produtos de uma vez</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar Catálogo
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Exporte seu catálogo completo em Excel ou CSV</li>
                <li>Use para relatórios, análises ou backup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categorização e Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Organize seus produtos para facilitar a localização e análise:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Categorias:</strong> Agrupe produtos similares (ex: Material de Limpeza, Material de Escritório, Alimentos)</li>
            <li><strong>Tags:</strong> Adicione palavras-chave para busca rápida (ex: urgente, sazonal, premium)</li>
            <li><strong>Filtros por fornecedor:</strong> Veja rapidamente quais produtos cada fornecedor oferece</li>
            <li><strong>Subcategorias:</strong> Crie hierarquias para melhor organização</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Controle de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para produtos com controle de estoque ativado:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Alertas de estoque baixo:</strong> Receba notificações quando o estoque atingir o nível mínimo configurado</li>
            <li><strong>Histórico de movimentações:</strong> Veja entradas e saídas de produtos</li>
            <li><strong>Inventário:</strong> Realize contagens periódicas e ajustes de estoque</li>
            <li><strong>Previsão de demanda:</strong> Analise padrões de consumo para planejar compras</li>
          </ul>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O controle de estoque é opcional e pode ser ativado por produto nas configurações.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Use códigos únicos e padronizados para cada produto</li>
            <li>Inclua descrições detalhadas para evitar confusões nas cotações</li>
            <li>Mantenha o catálogo atualizado, removendo ou desativando produtos obsoletos</li>
            <li>Vincule fornecedores aos produtos para agilizar o processo de cotação</li>
            <li>Use categorias consistentes para facilitar relatórios e análises</li>
            <li>Revise periodicamente os produtos mais cotados e seus preços médios</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
