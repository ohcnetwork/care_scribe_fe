import { useEffect, useState } from "react";
import { Controller } from "./components/Controller";
import { useFeatureFlags } from "@/Utils/featureFlags";
import { usePath } from "raviger";

export { default as manifest } from "./manifest";

export function Entry() {
  const path = usePath();
  const facilityId = path?.includes("/facility/")
    ? path.split("/facility/")[1].split("/")[0]
    : undefined;
  const [forms, setForms] = useState<NodeListOf<Element>>();
  const featureFlags = useFeatureFlags(facilityId);
  const SCRIBE_ENABLED = featureFlags.includes("SCRIBE_ENABLED");

  useEffect(() => {
    if (!SCRIBE_ENABLED) return;
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const forms = document.querySelectorAll('[data-scribe-form="true"]');
          setForms(forms);
        }
      }
    });
    const config = { childList: true, subtree: true };
    observer.observe(document.body, config);
    return () => observer.disconnect();
  }, [SCRIBE_ENABLED]);

  return <div>{!!forms?.length && <Controller />}</div>;
}
