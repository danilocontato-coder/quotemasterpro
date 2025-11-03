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
import { FileText, Search, MoreVertical, Eye, Download, Mail, MessageSquare, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  mockInvitationLetters, 
  mockInvitationLetterSuppliers, 
  getLetterStatusText, 
  getLetterStatusColor 
} from "@/data/mockInvitationLetters";
import { InvitationLetterModal } from "@/components/quotes/InvitationLetterModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function InvitationLettersList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter letters
  const filteredLetters = mockInvitationLetters.filter(letter => {
    const matchesSearch = letter.letter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.quote_title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || letter.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewPDF = (letterId: string) => {
    const letter = mockInvitationLetters.find(l => l.id === letterId);
    if (letter) {
      toast.info(`Visualizando PDF da Carta ${letter.letter_number}`, {
        description: 'Funcionalidade será implementada na Fase 2'
      });
    }
  };

  const handleDownloadPDF = (letterId: string) => {
    const letter = mockInvitationLetters.find(l => l.id === letterId);
    if (letter) {
      toast.success(`Download iniciado: Carta ${letter.letter_number}.pdf`);
    }
  };

  const handleResend = (letterId: string) => {
    const letter = mockInvitationLetters.find(l => l.id === letterId);
    if (letter) {
      toast.success(`Carta ${letter.letter_number} reenviada para ${letter.supplier_ids.length} fornecedor(es)`);
    }
  };

  const handleCancel = (letterId: string) => {
    const letter = mockInvitationLetters.find(l => l.id === letterId);
    if (letter) {
      // Update status in mock data
      letter.status = 'cancelled';
      toast.success(`Carta ${letter.letter_number} cancelada`);
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
                <p className="text-2xl font-bold">{mockInvitationLetters.length}</p>
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
                  {mockInvitationLetters.filter(l => l.status === 'sent').length}
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
                  {mockInvitationLetters.filter(l => l.status === 'draft').length}
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
                  {mockInvitationLetters.length > 0 
                    ? Math.round((mockInvitationLetters.reduce((sum, l) => sum + l.responses_count, 0) / 
                        mockInvitationLetters.reduce((sum, l) => sum + l.supplier_ids.length, 0)) * 100)
                    : 0}%
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
                filteredLetters.map((letter) => (
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
                        {letter.quote_title}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">
                          {letter.supplier_ids.length}
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
                          <span className="text-sm">{letter.responses_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{letter.viewed_count}</span>
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
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar Carta
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
