import { Badge } from '@/components/ui/badge';
import { CONTRACT_STATUSES, CONTRACT_STATUS_COLORS, type ContractStatus } from '@/constants/contracts';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

export const ContractStatusBadge = ({ status, className }: ContractStatusBadgeProps) => {
  return (
    <Badge className={`${CONTRACT_STATUS_COLORS[status]} ${className || ''}`}>
      {CONTRACT_STATUSES[status]}
    </Badge>
  );
};
