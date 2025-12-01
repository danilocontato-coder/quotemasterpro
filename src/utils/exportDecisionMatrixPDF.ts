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
  
  // Medal colors
  const goldColor: [number, number, number] = [255, 193, 7];
  const silverColor: [number, number, number] = [158, 158, 158];
  const bronzeColor: [number, number, number] = [205, 127, 50];

  // Helper to add page footer
  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Gerado pelo Cotiz em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - Pagina ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  };

  // Helper to draw medal circle
  const drawMedal = (x: number, y: number, rank: number) => {
    const radius = 6;
    let color: [number, number, number];
    let label: string;
    
    switch (rank) {
      case 0:
        color = goldColor;
        label = '1';
        break;
      case 1:
        color = silverColor;
        label = '2';
        break;
      case 2:
        color = bronzeColor;
        label = '3';
        break;
      default:
        color = [100, 100, 100];
        label = `${rank + 1}`;
    }
    
    doc.setFillColor(...color);
    doc.circle(x, y, radius, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, y + 3, { align: 'center' });
  };

  // ========== HEADER ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZ', margin, 18);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('ANALISE COMPARATIVA DE PROPOSTAS', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Matriz de Decisao Ponderada', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 36, { align: 'center' });

  yPos = 50;

  // ========== QUOTE INFO ==========
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACOES DA COTACAO', margin, yPos);
  
  // Underline
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 2, margin + 60, yPos + 2);
  
  yPos += 10;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(`Codigo: ${quoteCode}`, margin + 5, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Descricao: ${quoteName}`, margin + 5, yPos + 18);
  
  if (clientName) {
    doc.setTextColor(100, 100, 100);
    doc.text(`Cliente: ${clientName}`, pageWidth - margin - 5, yPos + 10, { align: 'right' });
  }
  
  doc.setTextColor(...darkText);
  doc.text(`Propostas analisadas: ${rankedProposals.length}`, pageWidth - margin - 5, yPos + 18, { align: 'right' });

  yPos += 38;

  // ========== WEIGHTS CONFIGURATION ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('CONFIGURACAO DE PESOS', margin, yPos);
  
  // Underline
  doc.line(margin, yPos + 2, margin + 55, yPos + 2);
  yPos += 10;

  const weightLabels = [
    { key: 'price', label: 'Preco' },
    { key: 'deliveryTime', label: 'Prazo' },
    { key: 'shippingCost', label: 'Frete' },
    { key: 'warranty', label: 'Garantia' },
    { key: 'deliveryScore', label: 'Pontualidade' },
    { key: 'reputation', label: 'Reputacao' },
  ];

  const weightColWidth = (pageWidth - (margin * 2)) / 6;
  
  weightLabels.forEach((w, i) => {
    const x = margin + (i * weightColWidth);
    const value = weights[w.key as keyof WeightConfig];
    
    // Background box
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(x + 2, yPos, weightColWidth - 4, 24, 2, 2, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(w.label, x + weightColWidth / 2, yPos + 8, { align: 'center' });
    
    // Value
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${value}%`, x + weightColWidth / 2, yPos + 19, { align: 'center' });
  });

  yPos += 34;

  // ========== RANKING TABLE ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RANKING DAS PROPOSTAS', margin, yPos);
  
  // Underline
  doc.line(margin, yPos + 2, margin + 55, yPos + 2);
  yPos += 8;

  const getMedalText = (index: number) => {
    switch (index) {
      case 0: return '1o';
      case 1: return '2o';
      case 2: return '3o';
      default: return `${index + 1}o`;
    }
  };

  const tableData = rankedProposals.map((p, i) => [
    getMedalText(i),
    p.name,
    p.score.toFixed(1),
    formatCurrency(p.proposal.totalPrice),
    `${p.proposal.deliveryTime} dias`,
    p.proposal.shippingCost > 0 ? formatCurrency(p.proposal.shippingCost) : 'Gratis',
    `${p.proposal.warrantyMonths} meses`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Pos', 'Fornecedor', 'Score', 'Preco Total', 'Prazo', 'Frete', 'Garantia']],
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
      // Highlight winner row with gold background
      if (data.row.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [255, 251, 235]; // Light gold
        data.cell.styles.fontStyle = 'bold';
      }
      // Silver for second
      if (data.row.index === 1 && data.section === 'body') {
        data.cell.styles.fillColor = [248, 250, 252]; // Light silver
      }
      // Bronze for third
      if (data.row.index === 2 && data.section === 'body') {
        data.cell.styles.fillColor = [254, 249, 244]; // Light bronze
      }
    },
    margin: { left: margin, right: margin }
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ========== WINNER HIGHLIGHT ==========
  if (rankedProposals.length > 0) {
    const winner = rankedProposals[0];
    
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PROPOSTA RECOMENDADA', margin, yPos);
    
    // Star icon (drawn as filled shape)
    doc.setFillColor(...goldColor);
    const starX = margin + 58;
    const starY = yPos - 3;
    doc.circle(starX, starY, 3, 'F');
    
    // Underline
    doc.line(margin, yPos + 2, margin + 55, yPos + 2);
    yPos += 8;

    // Winner card with green border
    doc.setDrawColor(...accentGreen);
    doc.setLineWidth(2);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 50, 3, 3, 'FD');

    // Draw gold medal
    drawMedal(margin + 12, yPos + 15, 0);

    // Winner content
    doc.setTextColor(...darkText);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(winner.name, margin + 25, yPos + 18);
    
    doc.setFontSize(22);
    doc.setTextColor(...accentGreen);
    doc.text(`${winner.score.toFixed(1)} pts`, pageWidth - margin - 8, yPos + 18, { align: 'right' });

    // Winner details in grid
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    
    const detailsY = yPos + 30;
    const col1 = margin + 10;
    const col2 = margin + 90;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Preco:', col1, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(winner.proposal.totalPrice), col1 + 25, detailsY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo:', col2, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${winner.proposal.deliveryTime} dias`, col2 + 25, detailsY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Frete:', col1, detailsY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(winner.proposal.shippingCost > 0 ? formatCurrency(winner.proposal.shippingCost) : 'Gratis', col1 + 25, detailsY + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Garantia:', col2, detailsY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${winner.proposal.warrantyMonths} meses`, col2 + 35, detailsY + 12);

    yPos += 60;
  }

  // ========== QUOTE ITEMS (if space available) ==========
  if (quoteItems.length > 0 && yPos < doc.internal.pageSize.getHeight() - 70) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('ITENS DA COTACAO', margin, yPos);
    
    // Underline
    doc.line(margin, yPos + 2, margin + 45, yPos + 2);
    yPos += 8;

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

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ========== METHODOLOGY NOTE ==========
  if (yPos < doc.internal.pageSize.getHeight() - 45) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('METODOLOGIA', margin, yPos);
    
    // Underline
    doc.line(margin, yPos + 2, margin + 35, yPos + 2);
    yPos += 8;
    
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Cada proposta e avaliada em 6 dimensoes: preco, prazo de entrega, custo de frete, garantia, pontualidade',
      margin + 5, yPos + 8
    );
    doc.text(
      'e reputacao do fornecedor. Os valores sao normalizados em escala 0-100 e multiplicados pelos pesos',
      margin + 5, yPos + 15
    );
    doc.text(
      'configurados. O score final indica a melhor escolha considerando os criterios definidos pelo cliente.',
      margin + 5, yPos + 22
    );
  }

  // Add footer to all pages
  addFooter();

  // Save the PDF - use quoteCode directly (already formatted as RFQ015)
  const timestamp = new Date().toISOString().split('T')[0];
  const safeCode = quoteCode.replace('#', '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Matriz_Decisao_${safeCode}_${timestamp}.pdf`;
  doc.save(filename);
}
