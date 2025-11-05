import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Build HTML for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #003366; padding-bottom: 20px; }
    .header h1 { color: #003366; margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #666; }
    .section { margin: 20px 0; }
    .section-title { background: #003366; color: white; padding: 8px 12px; font-weight: bold; font-size: 14px; }
    .info-row { display: flex; margin: 10px 0; }
    .info-label { font-weight: bold; width: 150px; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    table th { background: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
    table td { padding: 8px; border: 1px solid #ddd; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
    .status-sent { background: #3b82f6; color: white; }
    .status-draft { background: #9ca3af; color: white; }
    .status-cancelled { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CARTA CONVITE DE COTAÇÃO</h1>
    <p><strong>${letter.letter_number}</strong></p>
    <p>Emitida em ${new Date(letter.created_at).toLocaleDateString('pt-BR')}</p>
  </div>

  <div class="section">
    <div class="section-title">DADOS DO CLIENTE</div>
    <div class="info-row">
      <div class="info-label">Nome:</div>
      <div class="info-value">${letter.clients?.name || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">CNPJ:</div>
      <div class="info-value">${letter.clients?.cnpj || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Endereço:</div>
      <div class="info-value">${letter.clients?.address || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DADOS DA CARTA CONVITE</div>
    <div class="info-row">
      <div class="info-label">Título:</div>
      <div class="info-value">${letter.title}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Prazo de Resposta:</div>
      <div class="info-value">${new Date(letter.deadline).toLocaleDateString('pt-BR')}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Status:</div>
      <div class="info-value">
        <span class="status-badge status-${letter.status}">
          ${letter.status === 'sent' ? 'Enviada' : letter.status === 'draft' ? 'Rascunho' : 'Cancelada'}
        </span>
      </div>
    </div>
    ${letter.sent_at ? `
    <div class="info-row">
      <div class="info-label">Data de Envio:</div>
      <div class="info-value">${new Date(letter.sent_at).toLocaleDateString('pt-BR')} às ${new Date(letter.sent_at).toLocaleTimeString('pt-BR')}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">DESCRIÇÃO</div>
    <p style="margin: 15px 0; white-space: pre-wrap;">${letter.description}</p>
  </div>

  ${letter.attachments && letter.attachments.length > 0 ? `
  <div class="section">
    <div class="section-title">ANEXOS</div>
    <ul>
      ${letter.attachments.map((att: any) => `<li>${att.name} (${(att.size / 1024).toFixed(2)} KB)</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">FORNECEDORES CONVIDADOS (${suppliers?.length || 0})</div>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>CNPJ</th>
          <th>Email</th>
          <th>Status</th>
          <th>Data Resposta</th>
        </tr>
      </thead>
      <tbody>
        ${suppliers?.map(s => `
          <tr>
            <td>${s.suppliers?.name || 'N/A'}</td>
            <td>${s.suppliers?.cnpj || 'N/A'}</td>
            <td>${s.suppliers?.email || 'N/A'}</td>
            <td>${
              s.response_status === 'accepted' ? 'Aceito' :
              s.response_status === 'declined' ? 'Recusado' :
              s.response_status === 'no_interest' ? 'Sem Interesse' :
              'Pendente'
            }</td>
            <td>${s.response_date ? new Date(s.response_date).toLocaleDateString('pt-BR') : '-'}</td>
          </tr>
        `).join('') || '<tr><td colspan="5">Nenhum fornecedor convidado</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p><strong>Cotiz - Plataforma de Gestão de Cotações</strong></p>
    <p>Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
  </div>
</body>
</html>
    `;

    // For now, return HTML as base64 (in production, use a proper PDF library like puppeteer-core)
    // This is a placeholder - you would need to integrate a PDF generation service
    const base64Html = btoa(unescape(encodeURIComponent(htmlContent)));

    console.log('[generate-invitation-pdf] PDF generated successfully for letter:', letterId);

    return new Response(
      JSON.stringify({
        pdf: base64Html,
        filename: `carta-convite-${letter.letter_number}.html`
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
