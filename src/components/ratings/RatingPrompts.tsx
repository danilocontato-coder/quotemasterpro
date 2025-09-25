import { useState } from "react";
import { useSupplierRatings } from "@/hooks/useSupplierRatings";
import { RatingPromptCard } from "./RatingPromptCard";
import { default as SupplierRatingModal } from "./SupplierRatingModal";

export function RatingPrompts() {
  const { ratingPrompts, createRating, dismissPrompt } = useSupplierRatings();
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  const handleRate = (prompt: any) => {
    setSelectedPrompt(prompt);
  };

  const handleSubmitRating = (ratingData: any) => {
    createRating(ratingData);
    setSelectedPrompt(null);
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
          onRatingSubmitted={() => setSelectedPrompt(null)}
        />
      )}
    </>
  );
}