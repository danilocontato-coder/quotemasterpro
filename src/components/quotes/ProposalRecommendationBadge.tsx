import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { QuoteProposal } from './QuoteDetailModal';

interface ProposalRecommendationBadgeProps {
  proposal: QuoteProposal;
  allProposals: QuoteProposal[];
}

function calculateProposalScore(
  proposal: QuoteProposal,
  allProposals: QuoteProposal[]
): number {
  if (allProposals.length === 0) return 0;

  // Normalizar valores (0-1)
  const prices = allProposals.map(p => p.totalPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceNormalized = maxPrice > minPrice 
    ? 1 - (proposal.totalPrice - minPrice) / (maxPrice - minPrice)
    : 1;

  const deliveryTimes = allProposals.map(p => p.deliveryTime);
  const minDelivery = Math.min(...deliveryTimes);
  const maxDelivery = Math.max(...deliveryTimes);
  const deliveryNormalized = maxDelivery > minDelivery
    ? 1 - (proposal.deliveryTime - minDelivery) / (maxDelivery - minDelivery)
    : 1;

  const warranties = allProposals.map(p => p.warrantyMonths);
  const minWarranty = Math.min(...warranties);
  const maxWarranty = Math.max(...warranties);
  const warrantyNormalized = maxWarranty > minWarranty
    ? (proposal.warrantyMonths - minWarranty) / (maxWarranty - minWarranty)
    : 1;

  const reputations = allProposals.map(p => p.reputation);
  const minReputation = Math.min(...reputations);
  const maxReputation = Math.max(...reputations);
  const reputationNormalized = maxReputation > minReputation
    ? (proposal.reputation - minReputation) / (maxReputation - minReputation)
    : 1;

  const shippingCosts = allProposals.map(p => p.shippingCost);
  const minShipping = Math.min(...shippingCosts);
  const maxShipping = Math.max(...shippingCosts);
  const shippingNormalized = maxShipping > minShipping
    ? 1 - (proposal.shippingCost - minShipping) / (maxShipping - minShipping)
    : 1;

  // Calcular score com pesos
  const score = (
    priceNormalized * 0.35 +
    deliveryNormalized * 0.25 +
    warrantyNormalized * 0.15 +
    reputationNormalized * 0.15 +
    shippingNormalized * 0.10
  ) * 100;

  return Math.round(score);
}

export function ProposalRecommendationBadge({
  proposal,
  allProposals,
}: ProposalRecommendationBadgeProps) {
  const scores = allProposals.map(p => calculateProposalScore(p, allProposals));
  const maxScore = Math.max(...scores);
  const currentScore = calculateProposalScore(proposal, allProposals);
  
  const isRecommended = currentScore === maxScore && allProposals.length > 1;

  if (!isRecommended) return null;

  return (
    <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 font-semibold flex items-center gap-1 px-3 py-1">
      <Trophy className="h-3 w-3" />
      Recomendado - Score: {currentScore}
    </Badge>
  );
}

export function getProposalScore(
  proposal: QuoteProposal,
  allProposals: QuoteProposal[]
): number {
  return calculateProposalScore(proposal, allProposals);
}
