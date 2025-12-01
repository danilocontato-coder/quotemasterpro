import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeightConfig } from './decisionMatrixCalculator';
import { formatCurrency } from '@/lib/utils';

interface RankedProposal {
  id: string;
  name: string;
  score: number;
  metrics: {
    price: number;
    deliveryTime: number;
    shippingCost: number;
    warranty: number;
    deliveryScore: number;
    reputation: number;
  };
  proposal: {
    totalPrice: number;
    deliveryTime: number;
    shippingCost: number;
    warrantyMonths: number;
    paymentTerms?: string;
    notes?: string;
  };
}

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total?: number;
}

interface ExportParams {
  quoteName: string;
  quoteCode: string;
  clientName?: string;
  weights: WeightConfig;
  rankedProposals: RankedProposal[];
  quoteItems: QuoteItem[];
}

export function exportDecisionMatrixToPDF(params: ExportParams): void {
  const { quoteName, quoteCode, clientName, weights, rankedProposals, quoteItems } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [0, 51, 102]; // #003366
  const accentGreen: [number, number, number] = [34, 197, 94]; // #22C55E
  const lightGray: [number, number, number] = [245, 245, 245]; // #F5F5F5
  const darkText: [number, number, number] = [15, 23, 42]; // #0F172A

  // Helper to add page footer
  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Gerado pelo Cotiz em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  };

  // ========== HEADER ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISE COMPARATIVA DE PROPOSTAS', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Matriz de Decisão Ponderada', pageWidth / 2, 23, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 30, { align: 'center' });

  yPos = 45;

  // ========== QUOTE INFO ==========
  doc.setTextColor(...darkText);
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cotação: ${quoteCode}`, margin + 5, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(quoteName, margin + 5, yPos + 16);
  
  if (clientName) {
    doc.setTextColor(100, 100, 100);
    doc.text(`Cliente: ${clientName}`, pageWidth - margin - 5, yPos + 8, { align: 'right' });
  }
  
  doc.setTextColor(...darkText);
  doc.text(`${rankedProposals.length} propostas analisadas`, pageWidth - margin - 5, yPos + 16, { align: 'right' });

  yPos += 35;

  // ========== WEIGHTS CONFIGURATION ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('⚖️ CONFIGURAÇÃO DE PESOS', margin, yPos);
  yPos += 8;

  const weightLabels = [
    { key: 'price', label: 'Preço', emoji: '💰' },
    { key: 'deliveryTime', label: 'Prazo', emoji: '⏱️' },
    { key: 'shippingCost', label: 'Frete', emoji: '📦' },
    { key: 'warranty', label: 'Garantia', emoji: '🛡️' },
    { key: 'sla', label: 'Pontualidade', emoji: '⚡' },
    { key: 'reputation', label: 'Reputação', emoji: '⭐' },
  ];

  const weightColWidth = (pageWidth - (margin * 2)) / 6;
  
  weightLabels.forEach((w, i) => {
    const x = margin + (i * weightColWidth);
    const value = weights[w.key as keyof WeightConfig];
    
    // Background box
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(x + 2, yPos, weightColWidth - 4, 22, 2, 2, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`${w.emoji} ${w.label}`, x + weightColWidth / 2, yPos + 7, { align: 'center' });
    
    // Value
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${value}%`, x + weightColWidth / 2, yPos + 17, { align: 'center' });
  });

  yPos += 32;

  // ========== RANKING TABLE ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('🏆 RANKING DAS PROPOSTAS', margin, yPos);
  yPos += 5;

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}º`;
    }
  };

  const tableData = rankedProposals.map((p, i) => [
    getMedalEmoji(i),
    p.name,
    p.score.toFixed(1),
    formatCurrency(p.proposal.totalPrice),
    `${p.proposal.deliveryTime} dias`,
    p.proposal.shippingCost > 0 ? formatCurrency(p.proposal.shippingCost) : 'Grátis',
    `${p.proposal.warrantyMonths} meses`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Pos', 'Fornecedor', 'Score', 'Preço Total', 'Prazo', 'Frete', 'Garantia']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkText,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 45 },
      2: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'center', cellWidth: 23 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    didParseCell: function(data: any) {
      // Highlight winner row
      if (data.row.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [220, 252, 231]; // Light green
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ========== WINNER HIGHLIGHT ==========
  if (rankedProposals.length > 0) {
    const winner = rankedProposals[0];
    
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('⭐ PROPOSTA RECOMENDADA', margin, yPos);
    yPos += 5;

    // Winner card with green border
    doc.setDrawColor(...accentGreen);
    doc.setLineWidth(1.5);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 45, 3, 3, 'FD');

    // Winner content
    doc.setTextColor(...darkText);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`🥇 ${winner.name}`, margin + 8, yPos + 12);
    
    doc.setFontSize(20);
    doc.setTextColor(...accentGreen);
    doc.text(`${winner.score.toFixed(1)} pts`, pageWidth - margin - 8, yPos + 14, { align: 'right' });

    // Winner details
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    
    const detailsY = yPos + 25;
    const detailsCol1 = margin + 8;
    const detailsCol2 = margin + 80;
    
    doc.text(`💰 Preço: ${formatCurrency(winner.proposal.totalPrice)}`, detailsCol1, detailsY);
    doc.text(`⏱️ Prazo: ${winner.proposal.deliveryTime} dias`, detailsCol2, detailsY);
    
    doc.text(`📦 Frete: ${winner.proposal.shippingCost > 0 ? formatCurrency(winner.proposal.shippingCost) : 'Grátis'}`, detailsCol1, detailsY + 10);
    doc.text(`🛡️ Garantia: ${winner.proposal.warrantyMonths} meses`, detailsCol2, detailsY + 10);

    yPos += 55;
  }

  // ========== QUOTE ITEMS (if space available) ==========
  if (quoteItems.length > 0 && yPos < doc.internal.pageSize.getHeight() - 60) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('📋 ITENS DA COTAÇÃO', margin, yPos);
    yPos += 5;

    const itemsData = quoteItems.map((item, i) => [
      `${i + 1}`,
      item.product_name,
      `${item.quantity}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Produto', 'Qtd']],
      body: itemsData,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkText,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 20 },
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== METHODOLOGY NOTE ==========
  if (yPos < doc.internal.pageSize.getHeight() - 40) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('💡 Metodologia:', margin + 5, yPos + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Cada proposta é avaliada em 6 dimensões (preço, prazo, frete, garantia, pontualidade, reputação). Os valores são normalizados',
      margin + 5, yPos + 14
    );
    doc.text(
      'em escala 0-100 e multiplicados pelos pesos configurados. O score final indica a melhor escolha considerando os critérios definidos.',
      margin + 5, yPos + 20
    );
  }

  // Add footer to all pages
  addFooter();

  // Save the PDF
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Matriz_Decisao_${quoteCode}_${timestamp}.pdf`;
  doc.save(filename);
}
