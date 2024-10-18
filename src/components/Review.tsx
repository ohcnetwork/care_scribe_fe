import { useEffect, useState } from "react";
import { ScribeField } from "../types";
import CareIcon from "@/CAREUI/icons/CareIcon";

export default function ScribeReview(props: {
  toReview: (ScribeField & { newValue: unknown })[];
  onReviewComplete: () => void;
}) {
  const { toReview, onReviewComplete } = props;
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviewingField = toReview?.[reviewIndex];

  const reviewingFieldRect =
    reviewingField?.fieldElement.getBoundingClientRect();

  useEffect(() => setReviewIndex(0), [toReview]);

  const handleFinishReview = () => {
    onReviewComplete();
  };

  const handleBack = () => {
    reviewIndex > 0 && setReviewIndex((i) => i - 1);
  };

  const handleReject = () => {};

  const handleAccept = () => {
    reviewIndex < toReview.length
      ? setReviewIndex((i) => i + 1)
      : handleFinishReview();
  };

  return (
    <div className="fixed inset-0 z-20">
      <div className="absolute inset-0 flex flex-col">
        <div
          className="bg-black/50 transition-all"
          style={{ height: (reviewingFieldRect?.top || 0) - 10 + "px" }}
        />
        <div className="flex items-stretch">
          <div
            style={{ width: (reviewingFieldRect?.left || 0) - 10 + "px" }}
            className="bg-black/50 transition-all"
          />
          <div
            style={{
              height: (reviewingFieldRect?.height || 0) + 20 + "px",
              width: (reviewingFieldRect?.width || 0) + 20 + "px",
            }}
            className="transition-all"
          />
          <div className="flex-1 bg-black/50 transition-all" />
        </div>
        <div className="flex-1 bg-black/50 transition-all" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-4 p-4 text-white">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex aspect-square items-center justify-center rounded-full border border-white p-2 text-2xl font-semibold text-white"
          >
            <CareIcon icon="l-angle-left" />
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-lg font-semibold text-black transition-all hover:bg-secondary-100"
          >
            <CareIcon icon="l-times" className="text-2xl" />
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-lg font-semibold transition-all hover:bg-primary-600"
          >
            <CareIcon icon="l-check" className="text-2xl" />
            Accept
          </button>
        </div>
        <div className="font-semibold">
          Reviewing field {reviewIndex + 1} / {toReview.length}
        </div>
      </div>
    </div>
  );
}
