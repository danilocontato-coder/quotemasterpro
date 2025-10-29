import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimelineEvent } from '@/hooks/useQuoteTimeline';
import { formatLocalDateTime } from './dateUtils';

export function exportQuoteTimelineToPDF(
  events: TimelineEvent[],
  quoteInfo: {
    code: string;
    title: string;
    clientName: string;
    total: number;
  }
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Prestação de Contas - Timeline da Cotação', pageWidth / 2, 20, { align: 'center' });

  // Informações da cotação
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 35;
  
  doc.text(`Código: ${quoteInfo.code}`, 15, yPos);
  yPos += 6;
  doc.text(`Título: ${quoteInfo.title}`, 15, yPos);
  yPos += 6;
  doc.text(`Cliente: ${quoteInfo.clientName}`, 15, yPos);
  yPos += 6;
  doc.text(`Valor Total: R$ ${quoteInfo.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 15, yPos);
  yPos += 10;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Tabela de eventos
  const tableData = events.map(event => {
    const eventTypeLabels: Record<string, string> = {
      quote_created: 'Criação',
      status_change: 'Mudança de Status',
      supplier_response: 'Resposta Fornecedor',
      ai_analysis: 'Análise IA',
      technical_visit: 'Visita Técnica',
      delivery: 'Entrega',
      approval: 'Aprovação'
    };

    return [
      formatLocalDateTime(event.event_date),
      eventTypeLabels[event.event_type] || event.event_type,
      event.event_title,
      event.event_description,
      event.user_name || 'Sistema'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Data/Hora', 'Tipo', 'Título', 'Descrição', 'Usuário']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [0, 51, 102],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 60 },
      4: { cellWidth: 30 }
    }
  });

  // Rodapé
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Gerado em ${formatLocalDateTime(new Date().toISOString())} - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`prestacao-contas-${quoteInfo.code}-${new Date().getTime()}.pdf`);
}
