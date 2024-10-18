import CareIcon from "@/CAREUI/icons/CareIcon";
import { ScribeStatus } from "../types";
import { useTranslation } from "react-i18next";

export default function ScribeButton(props: {
  status: ScribeStatus;
  onClick: () => void;
}) {
  const { status, onClick } = props;
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`group z-10 flex items-center rounded-full ${status === "IDLE" ? "bg-primary-500 text-white hover:bg-primary-600" : "border border-secondary-400 bg-secondary-200 hover:bg-secondary-300"} transition-all`}
    >
      <div
        className={`flex aspect-square h-full items-center justify-center rounded-full ${status === "IDLE" ? "bg-primary-600 group-hover:bg-primary-700" : "bg-secondary-300 group-hover:bg-secondary-400"} p-4 text-xl`}
      >
        <CareIcon
          icon={
            status === "IDLE"
              ? "l-microphone"
              : status === "RECORDING"
                ? "l-microphone-slash"
                : "l-redo"
          }
        />
      </div>
      <div className="pl-2 pr-6 font-semibold">
        {status === "IDLE"
          ? t("voice_autofill")
          : status === "RECORDING"
            ? t("stop_recording")
            : t("retake_recording")}
      </div>
    </button>
  );
}
