import { useLetterEligibilitySummary } from "@/hooks/useLetterEligibilitySummary";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface LetterDocumentStatusBadgeProps {
  letterId: string;
  onClick?: () => void;
}

export default function LetterDocumentStatusBadge({ letterId, onClick }: LetterDocumentStatusBadgeProps) {
  const { summary, isLoading } = useLetterEligibilitySummary(letterId);

  if (isLoading) {
    return <Skeleton className="h-6 w-32" />;
  }

  if (summary.total === 0) {
    return null;
  }

  if (summary.allEligible) {
    return (
      <Badge
        className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
        onClick={onClick}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Todos elegíveis
      </Badge>
    );
  }

  if (summary.pending > 0) {
    return (
      <Badge
        className="bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200"
        onClick={onClick}
      >
        <Clock className="h-3 w-3 mr-1" />
        {summary.pending} pendente{summary.pending > 1 ? 's' : ''}
      </Badge>
    );
  }

  if (summary.ineligible > 0) {
    return (
      <Badge
        className="bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
        onClick={onClick}
      >
        <XCircle className="h-3 w-3 mr-1" />
        {summary.ineligible} não elegível{summary.ineligible > 1 ? 's' : ''}
      </Badge>
    );
  }

  return null;
}
