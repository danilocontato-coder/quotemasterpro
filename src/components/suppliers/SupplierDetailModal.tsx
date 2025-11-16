import { useState } from "react";
import { X, Building, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SupplierDocumentsTab } from "./SupplierDocumentsTab";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  type?: string;
  document_number?: string;
  document_type?: string;
  specialties?: string[];
  rating?: number;
  created_at: string;
  associated_at?: string;
  certification_date?: string;
  qualification_status?: string;
  qualification_score?: number;
}

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

export function SupplierDetailModal({
  supplier,
  clientId,
  open,
  onOpenChange,
  canEdit = false,
}: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info");

  if (!supplier) return null;

  const isCertified = supplier.type === 'certified';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{supplier.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={supplier.status === 'active' ? 'bg-success text-white' : 'bg-muted'}>
                  {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
                {isCertified && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Certificado
                  </Badge>
                )}
                {supplier.qualification_status && (
                  <Badge variant="outline">
                    {supplier.qualification_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="documents">Documentação</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Informações Gerais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Gerais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{supplier.email}</p>
                  </div>
                </div>

                {supplier.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{supplier.phone}</p>
                    </div>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">{supplier.address}</p>
                    </div>
                  </div>
                )}

                {supplier.document_number && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {supplier.document_type === 'cpf' ? 'CPF' : 'CNPJ'}
                      </p>
                      <p className="font-medium">{supplier.document_number}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isCertified ? 'Certificado desde' : 'Associado em'}
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(
                          isCertified
                            ? (supplier.certification_date || supplier.created_at)
                            : (supplier.associated_at || supplier.created_at)
                        ),
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>

                {supplier.qualification_score !== undefined && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Score de Qualificação</p>
                      <p className="font-medium">{supplier.qualification_score}/100</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Especialidades */}
            {supplier.specialties && supplier.specialties.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {supplier.specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant="outline"
                      className="bg-primary/5 text-primary border-primary/20"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <SupplierDocumentsTab
              supplierId={supplier.id}
              clientId={clientId}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="text-center text-muted-foreground py-8">
              <p>Histórico em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
