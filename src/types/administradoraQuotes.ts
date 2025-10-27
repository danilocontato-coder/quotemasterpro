export interface AdministradoraQuote {
  id: string;
  title: string;
  description?: string;
  status: string;
  client_id: string;
  client_name: string;
  on_behalf_of_client_id?: string;
  on_behalf_of_client_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  total: number;
  items_count: number;
  responses_count: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
  requires_visit?: boolean;
  visit_deadline?: string;
  advance_payment_required?: boolean;
  advance_payment_percentage?: number;
  local_code: string;
}

export interface AdministradoraQuoteDetail extends AdministradoraQuote {
  items: QuoteItem[];
  proposals: QuoteProposal[];
  visits?: QuoteVisit[];
  analyses?: AIProposalAnalysis[];
}

export interface QuoteItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface QuoteProposal {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_rating?: number;
  supplier_certified?: boolean;
  total_amount: number;
  delivery_time: number;
  shipping_cost?: number;
  warranty_months?: number;
  notes?: string;
  status: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    brand?: string;
    specifications?: string;
  }>;
}

export interface QuoteVisit {
  id: string;
  supplier_id: string;
  scheduled_date: string;
  status: string;
  notes?: string;
}

export interface AIProposalAnalysis {
  id: string;
  proposal_id: string;
  quote_id: string;
  analysis_type: string;
  analysis_data?: any;
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
  recommendation?: string;
  created_at: string;
}

export interface AICredits {
  client_id: string;
  available_credits: number;
  total_earned: number;
  total_spent: number;
}

export interface AICreditsTransaction {
  id: string;
  client_id: string;
  amount: number;
  reason: string;
  reference_id?: string;
  created_at: string;
}

export interface SupplierSuggestion {
  id: string;
  name: string;
  match_score: number;
  is_certified: boolean;
  specialties: string[];
  region?: string;
  state?: string;
  city?: string;
  rating?: number;
}

export interface DecisionMatrixWeights {
  price: number;
  delivery_time: number;
  freight: number;
  warranty: number;
  sla: number;
  reputation: number;
}

export interface DecisionMatrixResult {
  proposal_id: string;
  supplier_name: string;
  total_score: number;
  rank: number;
  normalized_scores: {
    price: number;
    delivery_time: number;
    freight: number;
    warranty: number;
    sla: number;
    reputation: number;
  };
}
