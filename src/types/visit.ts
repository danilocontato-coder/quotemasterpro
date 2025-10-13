export interface QuoteVisit {
  id: string;
  quote_id: string;
  supplier_id: string;
  supplier_name?: string;
  client_id: string;
  scheduled_date: string;
  confirmed_date?: string;
  requested_date: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'overdue';
  notes?: string;
  attachments: string[];
  reschedule_count: number;
  reschedule_reason?: string;
  previous_date?: string;
  confirmed_by?: string;
  confirmation_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VisitSettings {
  id: string;
  client_id: string;
  overdue_tolerance_days: number;
  max_reschedule_attempts: number;
  auto_disqualify_on_overdue: boolean;
  auto_confirm_after_days?: number;
  notify_before_visit_days: number;
  notify_on_overdue: boolean;
  created_at: string;
  updated_at: string;
}
