import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @ts-ignore
import jsPDF from 'https://esm.sh/jspdf@2.5.1';
import { corsHeaders } from '../_shared/cors.ts';

interface GeneratePDFRequest {
  letterId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { letterId }: GeneratePDFRequest = await req.json();

    console.log('[generate-invitation-pdf] Generating PDF for letter:', letterId);

    // Fetch letter data
    const { data: letter, error: letterError } = await supabase
      .from('invitation_letters')
      .select(`
        *,
        quotes (
          id,
          local_code,
          title,
          description
        ),
        clients (
          id,
          name,
          cnpj,
          address
        )
      `)
      .eq('id', letterId)
      .single();

    if (letterError || !letter) {
      console.error('[generate-invitation-pdf] Letter not found:', letterError);
      throw new Error('Carta convite não encontrada');
    }

    // Fetch suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('invitation_letter_suppliers')
      .select(`
        id,
        response_status,
        response_date,
        suppliers (
          id,
          name,
          cnpj,
          email
        )
      `)
      .eq('invitation_letter_id', letterId);

    if (suppliersError) {
      console.error('[generate-invitation-pdf] Error fetching suppliers:', suppliersError);
      throw new Error('Erro ao buscar fornecedores');
    }

    // Create PDF with jsPDF
    const doc = new jsPDF();
    
    // Colors
    const primaryColor = '#003366';
    const lightGray = '#f5f5f5';
    
    let yPosition = 20;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('CARTA CONVITE DE COTAÇÃO', 105, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor('#666666');
    doc.text(letter.letter_number, 105, yPosition, { align: 'center' });
    
    yPosition += 5;
    doc.setFontSize(10);
    doc.text(`Emitida em ${new Date(letter.created_at).toLocaleDateString('pt-BR')}`, 105, yPosition, { align: 'center' });
    
    // Line separator
    yPosition += 8;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    
    // Client Data Section
    yPosition += 10;
    doc.setFillColor(primaryColor);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('DADOS DO CLIENTE', 25, yPosition + 5.5);
    
    yPosition += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Nome: ${letter.clients?.name || 'N/A'}`, 25, yPosition);
    
    yPosition += 6;
    doc.text(`CNPJ: ${letter.clients?.cnpj || 'N/A'}`, 25, yPosition);
    
    yPosition += 6;
    const address = letter.clients?.address || 'N/A';
    if (address.length > 80) {
      const lines = doc.splitTextToSize(`Endereço: ${address}`, 160);
      doc.text(lines, 25, yPosition);
      yPosition += (lines.length - 1) * 6;
    } else {
      doc.text(`Endereço: ${address}`, 25, yPosition);
    }
    
    // Letter Data Section
    yPosition += 12;
    doc.setFillColor(primaryColor);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('DADOS DA CARTA CONVITE', 25, yPosition + 5.5);
    
    yPosition += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Título: ${letter.title}`, 25, yPosition);
    
    yPosition += 6;
    doc.text(`Prazo de Resposta: ${new Date(letter.deadline).toLocaleDateString('pt-BR')}`, 25, yPosition);
    
    yPosition += 6;
    const statusText = letter.status === 'sent' ? 'Enviada' : letter.status === 'draft' ? 'Rascunho' : 'Cancelada';
    doc.text(`Status: ${statusText}`, 25, yPosition);
    
    if (letter.sent_at) {
      yPosition += 6;
      const sentDate = new Date(letter.sent_at);
      doc.text(`Data de Envio: ${sentDate.toLocaleDateString('pt-BR')} às ${sentDate.toLocaleTimeString('pt-BR')}`, 25, yPosition);
    }
    
    // Description Section
    yPosition += 12;
    doc.setFillColor(primaryColor);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('DESCRIÇÃO', 25, yPosition + 5.5);
    
    yPosition += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const descriptionLines = doc.splitTextToSize(letter.description, 160);
    doc.text(descriptionLines, 25, yPosition);
    yPosition += descriptionLines.length * 6;
    
    // Attachments Section (if any)
    if (letter.attachments && Array.isArray(letter.attachments) && letter.attachments.length > 0) {
      yPosition += 8;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(primaryColor);
      doc.rect(20, yPosition, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('ANEXOS', 25, yPosition + 5.5);
      
      yPosition += 13;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      letter.attachments.forEach((att: any) => {
        doc.text(`• ${att.name} (${(att.size / 1024).toFixed(2)} KB)`, 25, yPosition);
        yPosition += 5;
      });
    }
    
    // Suppliers Section
    yPosition += 10;
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFillColor(primaryColor);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`FORNECEDORES CONVIDADOS (${suppliers?.length || 0})`, 25, yPosition + 5.5);
    
    yPosition += 13;
    
    if (suppliers && suppliers.length > 0) {
      // Table header
      doc.setFillColor(lightGray);
      doc.rect(20, yPosition, 170, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Nome', 25, yPosition + 5.5);
      doc.text('CNPJ', 80, yPosition + 5.5);
      doc.text('Email', 120, yPosition + 5.5);
      doc.text('Status', 165, yPosition + 5.5);
      
      yPosition += 10;
      doc.setFont(undefined, 'normal');
      
      // Table rows
      suppliers.forEach((s: any) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const statusMap: Record<string, string> = {
          'accepted': 'Aceito',
          'declined': 'Recusado',
          'no_interest': 'Sem Interesse',
          'pending': 'Pendente'
        };
        
        doc.text(s.suppliers?.name || 'N/A', 25, yPosition);
        doc.text(s.suppliers?.cnpj || 'N/A', 80, yPosition);
        doc.text(s.suppliers?.email || 'N/A', 120, yPosition);
        doc.text(statusMap[s.response_status] || 'Pendente', 165, yPosition);
        
        yPosition += 7;
      });
    } else {
      doc.setFontSize(10);
      doc.text('Nenhum fornecedor convidado', 25, yPosition);
      yPosition += 7;
    }
    
    // Footer
    yPosition += 15;
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setDrawColor('#dddddd');
    doc.setLineWidth(0.3);
    doc.line(20, yPosition, 190, yPosition);
    
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor('#666666');
    doc.text('Cotiz - Plataforma de Gestão de Cotações', 105, yPosition, { align: 'center' });
    
    yPosition += 5;
    const now = new Date();
    doc.text(`Documento gerado automaticamente em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 105, yPosition, { align: 'center' });
    
    // Generate PDF as base64
    const pdfOutput = doc.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));

    console.log('[generate-invitation-pdf] PDF generated successfully for letter:', letterId);

    return new Response(
      JSON.stringify({
        pdf: base64Pdf,
        filename: `carta-convite-${letter.letter_number}.pdf`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[generate-invitation-pdf] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
