// Database schema definition for Supabase integration
// This file defines the expected database structure for the application

export interface DatabaseTables {
  // Authentication and User Management
  profiles: {
    id: string; // References auth.users
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'admin' | 'manager' | 'collaborator' | 'supplier';
    client_id: string | null; // References clients
    supplier_id: string | null; // References suppliers
    active: boolean;
    created_at: string;
    updated_at: string;
  };

  // Client/Condominium Management
  clients: {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    whatsapp: string | null;
    address: string;
    subscription_plan_id: string; // References subscription_plans
    status: 'active' | 'inactive';
    settings: Record<string, any> | null;
    created_at: string;
    updated_at: string;
  };

  // Subscription Plans
  subscription_plans: {
    id: string;
    name: string;
    display_name: string;
    price: number;
    currency: string;
    features: string[];
    limits: {
      max_quotes: number;
      max_suppliers: number;
      max_users: number;
      storage_gb: number;
    };
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };

  // Supplier Management
  suppliers: {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    whatsapp: string | null;
    address: string;
    subscription_plan_id: string | null; // References subscription_plans
    type: 'local' | 'certificado'; // Local: client-specific, Certificado: platform-verified
    client_id: string | null; // For local suppliers
    region: string | null; // For certificado suppliers
    state: string | null;
    city: string | null;
    is_certified: boolean;
    specialties: string[];
    rating: number | null;
    completed_orders: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };

  // Supplier Groups/Categories
  supplier_groups: {
    id: string;
    name: string;
    description: string | null;
    client_id: string; // References clients
    created_at: string;
    updated_at: string;
  };

  // Products/Items Management
  products: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    stock_quantity: number;
    min_stock_level: number | null;
    supplier_id: string | null; // References suppliers
    client_id: string; // References clients
    unit_price: number | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };

  // Quote Management
  quotes: {
    id: string;
    title: string;
    description: string;
    total: number;
    status: 'draft' | 'sent' | 'under_review' | 'approved' | 'rejected' | 'finalized' | 'cancelled';
    client_id: string; // References clients
    created_by: string; // References profiles
    deadline: string | null;
    notes: string | null;
    attachments: string[] | null; // File URLs
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
  };

  // Quote Items
  quote_items: {
    id: string;
    quote_id: string; // References quotes
    product_id: string | null; // References products
    product_name: string; // For ad-hoc items
    quantity: number;
    unit_price: number;
    total: number;
    supplier_id: string | null; // References suppliers
    notes: string | null;
    created_at: string;
    updated_at: string;
  };

  // Quote Responses from Suppliers
  quote_responses: {
    id: string;
    quote_id: string; // References quotes
    supplier_id: string; // References suppliers
    items: {
      quote_item_id: string;
      unit_price: number;
      availability: 'available' | 'limited' | 'unavailable';
      delivery_time: string | null;
      notes: string | null;
    }[];
    total_amount: number;
    delivery_time: string | null;
    validity: string | null;
    notes: string | null;
    status: 'pending' | 'submitted' | 'selected' | 'rejected';
    created_at: string;
    updated_at: string;
  };

  // Approval Workflow
  approvals: {
    id: string;
    quote_id: string; // References quotes
    approver_id: string; // References profiles
    status: 'pending' | 'approved' | 'rejected';
    comments: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
  };

  // Payment Management
  payments: {
    id: string;
    quote_id: string; // References quotes
    amount: number;
    status: 'pending' | 'in_escrow' | 'waiting_confirmation' | 'delivered' | 'paid' | 'disputed' | 'cancelled';
    payment_method: string | null;
    external_payment_id: string | null; // Stripe, PagSeguro, etc.
    paid_at: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
  };

  // Payment Transactions/History
  payment_transactions: {
    id: string;
    payment_id: string; // References payments
    type: 'payment' | 'refund' | 'dispute' | 'delivery_confirmation';
    amount: number;
    description: string;
    metadata: Record<string, any> | null;
    created_at: string;
  };

  // Communication & Notifications
  notifications: {
    id: string;
    user_id: string; // References profiles
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    data: Record<string, any> | null;
    created_at: string;
  };

  // Audit Log
  audit_logs: {
    id: string;
    user_id: string; // References profiles
    action_type: string;
    entity_type: string;
    entity_id: string;
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    details: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  };

  // Supplier Ratings
  supplier_ratings: {
    id: string;
    supplier_id: string; // References suppliers
    client_id: string; // References clients
    rater_id: string; // References profiles
    quote_id: string | null; // References quotes
    overall_rating: number; // 1-5
    quality_rating: number; // 1-5
    delivery_rating: number; // 1-5
    service_rating: number; // 1-5
    price_rating: number; // 1-5
    comments: string | null;
    created_at: string;
    updated_at: string;
  };

  // File Storage
  attachments: {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    entity_type: string; // 'quote', 'payment', etc.
    entity_id: string;
    uploaded_by: string; // References profiles
    created_at: string;
  };

  // API Integrations & Settings
  api_integrations: {
    id: string;
    client_id: string; // References clients
    integration_type: 'whatsapp' | 'email' | 'payment' | 'sms';
    provider: string; // 'twilio', 'sendgrid', 'stripe', etc.
    settings: Record<string, any>;
    api_key_encrypted: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };
}

// RLS (Row Level Security) Policies needed for Supabase
export const RLS_POLICIES = {
  profiles: [
    'Users can view their own profile',
    'Users can update their own profile',
    'Admins can view all profiles',
    'Managers can view profiles in their client'
  ],
  
  clients: [
    'Users can only view their own client data',
    'Admins can view all clients'
  ],

  suppliers: [
    'Users can view suppliers linked to their client',
    'Users can view certificado suppliers',
    'Suppliers can view their own data',
    'Admins can view all suppliers'
  ],

  quotes: [
    'Users can view quotes from their client',
    'Suppliers can view quotes assigned to them',
    'Admins can view all quotes'
  ],

  payments: [
    'Users can view payments from their client quotes',
    'Suppliers can view their payment data',
    'Admins can view all payments'
  ],

  audit_logs: [
    'Users can view their own audit logs',
    'Managers can view logs from their client',
    'Admins can view all audit logs'
  ]
};

// Indexes needed for performance
export const DATABASE_INDEXES = [
  'quotes.client_id',
  'quotes.status',
  'quotes.created_at',
  'quote_items.quote_id',
  'quote_responses.quote_id',
  'quote_responses.supplier_id',
  'approvals.quote_id',
  'approvals.approver_id',
  'payments.quote_id',
  'notifications.user_id',
  'notifications.read',
  'audit_logs.user_id',
  'audit_logs.created_at',
  'supplier_ratings.supplier_id',
  'attachments.entity_type',
  'attachments.entity_id'
];