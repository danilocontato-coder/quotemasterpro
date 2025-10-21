import { useState } from "react";
import { useSupplierRatings } from "@/hooks/useSupplierRatings";
import { RatingPromptCard } from "./RatingPromptCard";
import { default as SupplierRatingModal } from "./SupplierRatingModal";

interface RatingPromptsProps {
  onRated?: () => void;
}

export function RatingPrompts({ onRated }: RatingPromptsProps = {}) {
  const { ratingPrompts, dismissPrompt, refreshPrompts } = useSupplierRatings();
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  const handleRate = (prompt: any) => {
    setSelectedPrompt(prompt);
  };

  const handleRatingSubmitted = async () => {
    if (selectedPrompt) {
      await dismissPrompt(selectedPrompt.id);
    }
    setSelectedPrompt(null);
    await refreshPrompts();
    onRated?.();
  };

  if (ratingPrompts.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        {ratingPrompts.map((prompt) => (
          <RatingPromptCard
            key={prompt.id}
            prompt={prompt}
            onRate={() => handleRate(prompt)}
            onDismiss={() => dismissPrompt(prompt.id)}
          />
        ))}
      </div>

      {selectedPrompt && (
        <SupplierRatingModal
          open={!!selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          supplierId={selectedPrompt.supplier_id}
          supplierName={selectedPrompt.supplier_name}
          quoteId={selectedPrompt.quote_id}
          paymentId={selectedPrompt.payment_id}
          notificationId={selectedPrompt.id}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </>
  );
}