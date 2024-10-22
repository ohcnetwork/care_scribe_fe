import { useEffect, useState } from "react";
import { ScribeFieldReviewedSuggestion, ScribeFieldSuggestion } from "../types";
import CareIcon from "@/CAREUI/icons/CareIcon";
import { renderFieldValue, sleep, updateFieldValue } from "../utils";

export default function ScribeReview(props: {
  toReview: ScribeFieldSuggestion[];
  onReviewComplete: (accepted: ScribeFieldReviewedSuggestion[]) => void;
}) {
  const { toReview, onReviewComplete } = props;
  const [reviewIndex, setReviewIndex] = useState(0);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<
    ScribeFieldReviewedSuggestion[]
  >([]);

  const reviewingField = toReview?.[reviewIndex];

  const reviewingFieldRect =
    reviewingField?.fieldElement.getBoundingClientRect();

  useEffect(() => {
    reviewingField.fieldElement.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });
  }, [reviewingField]);

  useEffect(() => {
    setReviewIndex(0);
    setAcceptedSuggestions([]);
  }, [toReview]);

  const handleBack = () => {
    reviewIndex > 0 && setReviewIndex((i) => i - 1);
  };

  const handleReviewComplete = async (
    accepted?: typeof acceptedSuggestions,
  ) => {
    onReviewComplete(accepted || acceptedSuggestions);
  };

  const handleForward = (accepted?: typeof acceptedSuggestions) => {
    reviewIndex < toReview.length - 1
      ? setReviewIndex((i) => i + 1)
      : handleReviewComplete(accepted || acceptedSuggestions);
  };

  const handleVerdict = async (approved: boolean) => {
    const accepted = [
      ...acceptedSuggestions.filter((s) => s.suggestionIndex !== reviewIndex),
      {
        ...toReview[reviewIndex],
        approved,
        suggestionIndex: reviewIndex,
      },
    ];
    if (!approved) updateFieldValue(reviewingField);
    await sleep(150);
    setAcceptedSuggestions(accepted);
    handleForward(accepted);
  };

  useEffect(() => {
    const page = document.querySelector("[data-cui-page]") as HTMLElement;
    if (page) {
      page.insertAdjacentHTML(
        "beforeend",
        `<div style="height:50vh;" data-scribe-spacer></div>`,
      );
    }
    updateFieldValue(reviewingField, true);
    return () =>
      document
        .querySelectorAll(`[data-scribe-spacer]`)
        .forEach((e) => e.remove());
  }, [reviewingField]);

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
        {["string", "number"].includes(typeof reviewingField.value) && (
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-500/50 p-2 text-red-900">
              {renderFieldValue(reviewingField)}
            </div>
            <CareIcon icon="l-arrow-right" />
            <div className="rounded-lg bg-green-500/50 p-2 text-green-900">
              {renderFieldValue(reviewingField, true)}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex aspect-square items-center justify-center rounded-full border border-white p-2 text-2xl font-semibold text-white"
          >
            <CareIcon icon="l-angle-left" />
          </button>
          <button
            onClick={() => handleVerdict(false)}
            className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-lg font-semibold text-black transition-all hover:bg-secondary-100"
          >
            <CareIcon icon="l-times" className="text-2xl" />
            Reject
          </button>
          <button
            onClick={() => handleVerdict(true)}
            className="flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-lg font-semibold transition-all hover:bg-primary-600"
          >
            <CareIcon icon="l-check" className="text-2xl" />
            Accept
          </button>
        </div>
        <div className="font-semibold">
          Reviewing field {reviewIndex + 1} / {toReview.length}
        </div>
        <div className="flex items-center gap-4">
          {toReview.map((r, i) => (
            <button
              key={i}
              className={`aspect-square w-4 rounded-full ${acceptedSuggestions.find((s) => s.suggestionIndex === i)?.approved === true ? "bg-primary-500" : acceptedSuggestions.find((s) => s.suggestionIndex === i)?.approved === false ? "bg-red-500" : "bg-white"} ${reviewIndex === i ? "opacity-100" : "opacity-50"} transition-all`}
              onClick={() => setReviewIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
