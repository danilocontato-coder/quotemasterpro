import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Search, MoreVertical, Eye, Download, Mail, MessageSquare, X, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvitationLetterModal } from "@/components/quotes/InvitationLetterModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInvitationLetters, useCancelInvitationLetter } from "@/hooks/useInvitationLetters";

export default function InvitationLettersList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: invitationLetters, isLoading } = useInvitationLetters();
  const cancelLetterMutation = useCancelInvitationLetter();

  // Filter letters
  const filteredLetters = (invitationLetters || []).filter(letter => {
    const matchesSearch = letter.letter_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.quote_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || letter.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewPDF = (letterId: string) => {
    const letter = invitationLetters?.find(l => l.id === letterId);
    if (letter) {
      toast.info(`Visualizando PDF da Carta ${letter.letter_number}`, {
        description: 'Funcionalidade de PDF será implementada na Fase 2 - Sprint 2'
      });
    }
  };

  const handleDownloadPDF = (letterId: string) => {
    const letter = invitationLetters?.find(l => l.id === letterId);
    if (letter) {
      toast.info(`Download: Carta ${letter.letter_number}.pdf`, {
        description: 'Funcionalidade de PDF será implementada na Fase 2 - Sprint 2'
      });
    }
  };

  const handleResend = (letterId: string) => {
    const letter = invitationLetters?.find(l => l.id === letterId);
    if (letter) {
      toast.info(`Reenviar Carta ${letter.letter_number}`, {
        description: 'Funcionalidade de envio será implementada na Fase 2 - Sprint 3'
      });
    }
  };

  const handleCancel = (letterId: string) => {
    if (confirm("Tem certeza que deseja cancelar esta carta convite?")) {
      cancelLetterMutation.mutate(letterId);
    }
  };

  const handleViewQuote = (quoteId: string) => {
    navigate(`/app/quotes`);
  };

  const getDeadlineStatus = (deadline: string, status: string) => {
    if (status === 'cancelled') return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffInDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return <Badge variant="destructive" className="text-xs">Prazo expirado</Badge>;
    } else if (diffInDays <= 3) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
        {diffInDays} dia(s) restante(s)
      </Badge>;
    }
    return null;
  };

  const getLetterStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: "Rascunho",
      sent: "Enviada",
      cancelled: "Cancelada",
    };
    return statusMap[status] || status;
  };

  const getLetterStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: "bg-gray-500",
      sent: "bg-blue-500",
      cancelled: "bg-red-500",
    };
    return colorMap[status] || "";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cartas Convite</h1>
          <p className="text-muted-foreground">
            Gerencie convites formais para fornecedores participarem de cotações
          </p>
        </div>
        
        <InvitationLetterModal
          quote={{ 
            id: 'mock-quote', 
            title: 'Nova Cotação',
            client_id: '1'
          }}
          trigger={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Carta Convite
            </Button>
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Cartas</p>
                <p className="text-2xl font-bold">{invitationLetters?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {invitationLetters?.filter(l => l.status === 'sent').length || 0}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold text-gray-600">
                  {invitationLetters?.filter(l => l.status === 'draft').length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-green-600">
                  {(() => {
                    const totalResponses = invitationLetters?.reduce((sum, l) => {
                      const suppliers = l.invitation_letter_suppliers || [];
                      return sum + suppliers.filter(s => s.response_date).length;
                    }, 0) || 0;
                    
                    const totalSuppliers = invitationLetters?.reduce((sum, l) => {
                      return sum + (l.invitation_letter_suppliers?.length || 0);
                    }, 0) || 0;
                    
                    return totalSuppliers > 0 ? Math.round((totalResponses / totalSuppliers) * 100) : 0;
                  })()}%
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, título ou cotação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === "sent" ? "default" : "outline"}
                onClick={() => setStatusFilter("sent")}
                size="sm"
              >
                Enviadas
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                onClick={() => setStatusFilter("draft")}
                size="sm"
              >
                Rascunhos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cotação</TableHead>
                  <TableHead>Fornecedores</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLetters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all" 
                          ? "Nenhuma carta convite encontrada com os filtros aplicados" 
                          : "Nenhuma carta convite criada ainda"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLetters.map((letter) => {
                    const suppliers = letter.invitation_letter_suppliers || [];
                    const responsesCount = suppliers.filter(s => s.response_date).length;
                    const viewedCount = suppliers.filter(s => s.viewed_at).length;

                    return (
                      <TableRow key={letter.id}>
                        <TableCell>
                          <span className="font-mono font-medium">{letter.letter_number}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{letter.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Criada em {format(new Date(letter.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={() => handleViewQuote(letter.quote_id)}
                          >
                            {letter.quote_id}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary">
                              {suppliers.length}
                            </Badge>
                            <span className="text-xs text-muted-foreground">fornecedor(es)</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">
                              {format(new Date(letter.deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                            {getDeadlineStatus(letter.deadline, letter.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getLetterStatusColor(letter.status)}>
                            {getLetterStatusText(letter.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{responsesCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{viewedCount}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPDF(letter.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPDF(letter.id)}>
                                <Download className="h-4 w-4 mr-2" />
                                Baixar PDF
                              </DropdownMenuItem>
                              {letter.status === 'sent' && (
                                <DropdownMenuItem onClick={() => handleResend(letter.id)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Reenviar
                                </DropdownMenuItem>
                              )}
                              {letter.status !== 'cancelled' && (
                                <DropdownMenuItem 
                                  onClick={() => handleCancel(letter.id)}
                                  className="text-red-600"
                                  disabled={cancelLetterMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancelar Carta
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
