import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Search, FileText, Eye, Send, RefreshCw, Download, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterMetricCard } from '@/components/ui/filter-metric-card';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';
import { AnimatedHeader, AnimatedGrid, AnimatedSection } from '@/components/ui/animated-page';
import { useSupabaseInvitationLetters } from '@/hooks/useSupabaseInvitationLetters';
import { formatLocalDate } from '@/utils/dateUtils';
import { toast } from 'sonner';

// Lazy load modals
const CreateInvitationLetterModal = lazy(() => import('@/components/invitation-letters/CreateInvitationLetterModal'));
const InvitationLetterDetailModal = lazy(() => import('@/components/invitation-letters/InvitationLetterDetailModal'));

export default function InvitationLettersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<any | null>(null);

  const { letters, isLoading, error, sendLetter, resendLetter, cancelLetter, generatePDF, refetch } = useSupabaseInvitationLetters();

  // Filtrar cartas
  const filteredLetters = letters.filter((letter) => {
    const matchesSearch = letter.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         letter.letter_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || letter.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calcular métricas
  const totalLetters = letters.length;
  const sentLetters = letters.filter(l => l.status === 'sent').length;
  const draftLetters = letters.filter(l => l.status === 'draft').length;
  const cancelledLetters = letters.filter(l => l.status === 'cancelled').length;

  const handleViewDetails = (letter: any) => {
    setViewingLetter(letter);
    setIsDetailModalOpen(true);
  };

  const handleSendLetter = async (letterId: string) => {
    const success = await sendLetter(letterId);
    if (success) {
      toast.success('Carta enviada com sucesso!');
    }
  };

  const handleResendLetter = async (letterId: string) => {
    const success = await resendLetter(letterId);
    if (success) {
      toast.success('Carta reenviada com sucesso!');
    }
  };

  const handleCancelLetter = async (letterId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta carta convite?')) {
      const success = await cancelLetter(letterId);
      if (success) {
        toast.success('Carta cancelada');
      }
    }
  };

  const handleDownloadPDF = async (letter: any) => {
    const blob = await generatePDF(letter.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carta-convite-${letter.letter_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF gerado com sucesso!');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Rascunho' },
      sent: { variant: 'default', label: 'Enviada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' }
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <OptimizedSkeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <OptimizedSkeleton key={i} className="h-24" />
          ))}
        </div>
        <OptimizedSkeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <AnimatedHeader 
        title="Cartas Convite" 
        subtitle="Gerencie cartas convite para cotações formais"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Nova Carta Convite
          </Button>
        }
      />

      {/* Métricas */}
      <AnimatedGrid>
        <FilterMetricCard
          title="Total"
          value={totalLetters}
          icon={<FileText className="h-5 w-5" />}
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterMetricCard
          title="Enviadas"
          value={sentLetters}
          icon={<Send className="h-5 w-5" />}
          isActive={statusFilter === 'sent'}
          onClick={() => setStatusFilter('sent')}
        />
        <FilterMetricCard
          title="Rascunhos"
          value={draftLetters}
          icon={<FileText className="h-5 w-5" />}
          isActive={statusFilter === 'draft'}
          onClick={() => setStatusFilter('draft')}
        />
        <FilterMetricCard
          title="Canceladas"
          value={cancelledLetters}
          icon={<XCircle className="h-5 w-5" />}
          isActive={statusFilter === 'cancelled'}
          onClick={() => setStatusFilter('cancelled')}
        />
      </AnimatedGrid>

      {/* Busca e Filtros */}
      <AnimatedSection>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
        </Card>
      </AnimatedSection>

      {/* Lista de Cartas */}
      <AnimatedSection>
        <Card>
          <CardHeader>
            <CardTitle>Cartas Convite ({filteredLetters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLetters.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Nenhuma carta encontrada com os filtros aplicados'
                    : 'Nenhuma carta convite criada ainda'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira carta
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLetters.map((letter) => (
                  <Card key={letter.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{letter.title}</h3>
                            {getStatusBadge(letter.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Nº:</strong> {letter.letter_number}</p>
                            <p><strong>Prazo:</strong> {formatLocalDate(letter.deadline)}</p>
                            <p><strong>Criada em:</strong> {formatLocalDate(letter.created_at)}</p>
                            {letter.sent_at && (
                              <p><strong>Enviada em:</strong> {formatLocalDate(letter.sent_at)}</p>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {letter.viewed_count || 0} visualizações
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {letter.responses_count || 0} respostas
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(letter)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                          
                          {letter.status === 'draft' && (
                            <Button variant="default" size="sm" onClick={() => handleSendLetter(letter.id)}>
                              <Send className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
                          )}

                          {letter.status === 'sent' && (
                            <Button variant="outline" size="sm" onClick={() => handleResendLetter(letter.id)}>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reenviar
                            </Button>
                          )}

                          <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(letter)}>
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>

                          {letter.status !== 'cancelled' && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleCancelLetter(letter.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedSection>

      {/* Modals */}
      <Suspense fallback={null}>
        {isCreateModalOpen && (
          <CreateInvitationLetterModal
            open={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        )}

        {isDetailModalOpen && viewingLetter && (
          <InvitationLetterDetailModal
            letter={viewingLetter}
            open={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setViewingLetter(null);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
