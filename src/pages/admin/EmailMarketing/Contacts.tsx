import { useState } from 'react';
import { ArrowLeft, Upload, Download, Search, Filter, Tag, Trash2, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContactImport } from '@/components/admin/EmailMarketing/ContactImport';
import { useEmailContacts } from '@/hooks/useEmailContacts';

export default function EmailMarketingContacts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    contacts,
    loading,
    fetchContacts,
    importContacts,
    deleteContact,
    exportContacts,
    getStats
  } = useEmailContacts();

  const stats = getStats();

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteContact(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/email-marketing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contatos</h1>
            <p className="text-muted-foreground">Gerencie sua lista de contatos de e-mail</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Contatos
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Total</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-medium">Ativos</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-medium">Cancelados</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.unsubscribed}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-medium">Bounced</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.bounced}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="unsubscribed">Cancelados</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum contato encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name || '-'}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{contact.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contact.status === 'active' ? 'default' :
                        contact.status === 'unsubscribed' ? 'secondary' : 'destructive'
                      }
                    >
                      {contact.status === 'active' ? 'Ativo' :
                       contact.status === 'unsubscribed' ? 'Cancelado' : 'Bounced'}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{contact.source}</TableCell>
                  <TableCell>
                    {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(contact.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ContactImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importContacts}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
