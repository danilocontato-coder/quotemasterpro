import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentDetail {
  type: string;
  label: string;
  mandatory: boolean;
  status: 'missing' | 'pending' | 'validated' | 'rejected' | 'expired';
  fileName?: string;
  validatedAt?: string;
  expiryDate?: string;
  rejectionReason?: string;
}

interface SupplierEligibility {
  supplierId: string;
  supplierName: string;
  status: 'eligible' | 'pending' | 'ineligible' | 'not_checked';
  reason?: string;
  score: number;
  documents: DocumentDetail[];
  missingDocs: string[];
  pendingDocs: string[];
  expiredDocs: string[];
  rejectedDocs: string[];
}

interface ReportData {
  letterNumber: string;
  letterTitle: string;
  category?: string;
  deadline?: string;
  requiredDocuments: Array<{ type: string; label: string; mandatory: boolean }>;
  suppliers: SupplierEligibility[];
}

export async function exportEligibilityReport(data: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102); // Cor primária #003366
  doc.text('Relatório de Elegibilidade de Fornecedores', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Informações da Carta
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Informações da Carta Convite', 14, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const letterInfo = [
    ['Número da Carta:', data.letterNumber],
    ['Título:', data.letterTitle],
    ...(data.category ? [['Categoria:', data.category]] : []),
    ...(data.deadline ? [['Prazo:', format(new Date(data.deadline), "dd/MM/yyyy", { locale: ptBR })]] : []),
  ];

  letterInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Documentos Obrigatórios
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentos Obrigatórios', 14, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const mandatoryDocs = data.requiredDocuments.filter(d => d.mandatory);
  mandatoryDocs.forEach((doc_item, index) => {
    doc.text(`${index + 1}. ${doc_item.label}`, 14, yPosition);
    yPosition += 5;
  });

  yPosition += 10;

  // Resumo de Status
  const eligible = data.suppliers.filter(s => s.status === 'eligible').length;
  const pending = data.suppliers.filter(s => s.status === 'pending').length;
  const ineligible = data.suppliers.filter(s => s.status === 'ineligible').length;
  const notChecked = data.suppliers.filter(s => s.status === 'not_checked').length;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo de Status', 14, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const statusSummary = [
    ['✅ Elegíveis:', `${eligible} (${Math.round((eligible / data.suppliers.length) * 100)}%)`],
    ['⏳ Pendentes:', `${pending} (${Math.round((pending / data.suppliers.length) * 100)}%)`],
    ['❌ Não Elegíveis:', `${ineligible} (${Math.round((ineligible / data.suppliers.length) * 100)}%)`],
    ['⚠️ Não Verificados:', `${notChecked} (${Math.round((notChecked / data.suppliers.length) * 100)}%)`],
  ];

  statusSummary.forEach(([label, value]) => {
    doc.text(label, 14, yPosition);
    doc.text(value, 80, yPosition);
    yPosition += 6;
  });

  // Nova página para detalhes dos fornecedores
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento por Fornecedor', 14, yPosition);
  yPosition += 10;

  // Tabela de fornecedores e documentos
  data.suppliers.forEach((supplier, index) => {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Nome do fornecedor e status
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${supplier.supplierName}`, 14, yPosition);
    
    // Badge de status
    const statusColors: Record<string, [number, number, number]> = {
      eligible: [34, 197, 94],    // green
      pending: [234, 179, 8],     // yellow
      ineligible: [239, 68, 68],  // red
      not_checked: [156, 163, 175] // gray
    };
    const statusLabels: Record<string, string> = {
      eligible: 'ELEGÍVEL',
      pending: 'PENDENTE',
      ineligible: 'NÃO ELEGÍVEL',
      not_checked: 'NÃO VERIFICADO'
    };

    const [r, g, b] = statusColors[supplier.status];
    doc.setFillColor(r, g, b);
    doc.roundedRect(150, yPosition - 4, 35, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(statusLabels[supplier.status], 167.5, yPosition, { align: 'center' });
    
    yPosition += 8;

    // Score
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pontuação: ${supplier.score}%`, 14, yPosition);
    yPosition += 5;

    // Tabela de documentos
    const tableData = mandatoryDocs.map(reqDoc => {
      const supplierDoc = supplier.documents.find(d => d.type === reqDoc.type);
      
      let statusText = 'Ausente';
      let statusColor: [number, number, number] = [239, 68, 68]; // red
      
      if (supplierDoc) {
        switch (supplierDoc.status) {
          case 'validated':
            statusText = '✓ Validado';
            statusColor = [34, 197, 94]; // green
            break;
          case 'pending':
            statusText = '⏳ Pendente';
            statusColor = [234, 179, 8]; // yellow
            break;
          case 'rejected':
            statusText = '✗ Rejeitado';
            statusColor = [239, 68, 68]; // red
            break;
          case 'expired':
            statusText = '⚠ Expirado';
            statusColor = [249, 115, 22]; // orange
            break;
        }
      }

      return [
        reqDoc.label,
        statusText,
        supplierDoc?.fileName || '-',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Documento', 'Status', 'Arquivo']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Motivo se não elegível
    if (supplier.status === 'ineligible' && supplier.reason) {
      doc.setFontSize(8);
      doc.setTextColor(239, 68, 68);
      doc.setFont('helvetica', 'italic');
      const splitReason = doc.splitTextToSize(`Motivo: ${supplier.reason}`, pageWidth - 28);
      doc.text(splitReason, 14, yPosition);
      yPosition += splitReason.length * 4 + 5;
    }

    yPosition += 5;
  });

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${totalPages} • Relatório de Elegibilidade • Cotiz`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  const fileName = `Elegibilidade_${data.letterNumber}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
}
