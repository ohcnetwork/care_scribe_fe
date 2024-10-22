import { useState } from "react";
import { ScribeField, ScribeFieldSuggestion, ScribeStatus } from "../types";
import { useTranslation } from "react-i18next";
import { useTimer } from "@/Utils/useTimer";
import useSegmentedRecording from "@/Utils/useSegmentedRecorder";
import request from "@/Utils/request/request";
import routes from "../api/api";
import uploadFile from "@/Utils/request/uploadFile";
import TextAreaFormField from "@/Components/Form/FormFields/TextAreaFormField";
import ButtonV2 from "@/Components/Common/components/ButtonV2";
import CareIcon from "@/CAREUI/icons/CareIcon";
import {
  getFieldsToReview,
  scrapeFields,
  SCRIBE_PROMPT_MAP,
  sleep,
  updateFieldValue,
} from "../utils";
import * as Notify from "@/Utils/Notifications";
import ScribeButton from "./ScribeButton";
import animationData from "../assets/animation.json";
import Lottie from "lottie-react";
import ScribeReview from "./Review";

export function Controller() {
  const [status, setStatus] = useState<ScribeStatus>("IDLE");
  const { t } = useTranslation();
  const [micAllowed, setMicAllowed] = useState<null | boolean>(null);
  const [transcript, setTranscript] = useState<string>();
  const timer = useTimer();
  const [lastTranscript, setLastTranscript] = useState<string>();
  const [instanceId, setInstanceId] = useState<string>();
  const [toReview, setToReview] = useState<ScribeFieldSuggestion[]>();
  const [openEditTranscript, setOpenEditTranscript] = useState(false);

  const {
    isRecording,
    startRecording: startSegmentedRecording,
    stopRecording: stopSegmentedRecording,
    resetRecording,
    audioBlobs,
  } = useSegmentedRecording();

  // Keeps polling the scribe endpoint to check if transcript or ai response has been generated
  const poller = async (
    scribeInstanceId: string,
    type: "transcript" | "ai_response",
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await request(routes.getScribe, {
            pathParams: {
              external_id: scribeInstanceId,
            },
          });

          if (!res.data || res.error)
            throw new Error("Error getting scribe instance");

          const { status, transcript, ai_response } = res.data;

          if (
            status === "GENERATING_AI_RESPONSE" ||
            status === "COMPLETED" ||
            status === "FAILED"
          ) {
            clearInterval(interval);
            if (status === "FAILED") {
              Notify.Error({ msg: "Transcription failed" });
              return reject(new Error("Transcription failed"));
            }

            if (type === "transcript" && transcript) {
              return resolve(transcript);
            }

            if (type === "ai_response" && ai_response) {
              return resolve(ai_response);
            }

            reject(new Error(`Expected ${type} but it is unavailable.`));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2500);
    });
  };

  // gets the AI response and returns only the data that has changes
  const getAIResponse = async (
    scribeInstanceId: string,
    fields: ScribeField[],
  ) => {
    const hfields = await getHydratedFields(fields);
    const updatedFieldsResponse = await poller(scribeInstanceId, "ai_response");
    const parsedFormData = JSON.parse(updatedFieldsResponse ?? "{}");
    // run type validations
    const changedData = Object.entries(parsedFormData)
      .filter(([k, v]) => {
        const f = hfields.find((f) => f.id === k);
        if (!f) return false;
        if (v === f.current) return false;
        return true;
      })
      .map(([k, v]) => ({ [k]: v }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {});
    return changedData;
  };

  // gets the audio transcription
  const getTranscript = async (scribeInstanceId: string) => {
    const res = await request(routes.updateScribe, {
      body: {
        status: "READY",
      },
      pathParams: {
        external_id: scribeInstanceId,
      },
    });

    if (res.error || !res.data) throw Error("Error updating scribe instance");

    const transcript = await poller(scribeInstanceId, "transcript");
    setLastTranscript(transcript);
    setTranscript(transcript);
    return transcript;
  };

  // Uploads a scribe audio blob. Returns the response of the upload.
  const uploadAudio = async (audioBlob: Blob, scribeInstanceId: string) => {
    const category = "AUDIO";
    const name = "audio.mp3";
    const filename = Date.now().toString();

    const response = await request(routes.createScribeFileUpload, {
      body: {
        original_name: name,
        file_type: 1,
        name: filename,
        associating_id: scribeInstanceId,
        file_category: category,
        mime_type: audioBlob?.type?.split(";")?.[0],
      },
    });

    await new Promise<void>((resolve, reject) => {
      const url = response.data?.signed_url;
      const internal_name = response.data?.internal_name;
      const f = audioBlob;
      if (f === undefined) {
        reject(Error("No file to upload"));
        return;
      }
      const newFile = new File([f], `${internal_name}`, { type: f.type });
      const headers = {
        "Content-type": newFile?.type?.split(";")?.[0],
        "Content-disposition": "inline",
      };

      uploadFile(
        url || "",
        newFile,
        "PUT",
        headers,
        (xhr: XMLHttpRequest) => (xhr.status === 200 ? resolve() : reject()),
        null,
        reject,
      );
    });

    const res = request(routes.editScribeFileUpload, {
      body: { upload_completed: true },
      pathParams: {
        id: response.data?.id || "",
        fileType: "SCRIBE",
        associatingId: scribeInstanceId,
      },
    });
    return res;
  };

  // Sets up a scribe instance with the available recordings. Returns the instance ID.
  const createScribeInstance = async (fields: ScribeField[]) => {
    const hfields = await getHydratedFields(fields);
    const response = await request(routes.createScribe, {
      body: {
        status: "CREATED",
        form_data: hfields,
      },
    });
    if (response.error) throw Error("Error creating scribe instance");
    if (!response.data) throw Error("Response did not return any data");
    await Promise.all(
      audioBlobs.map((blob) =>
        uploadAudio(blob, response.data?.external_id ?? ""),
      ),
    );

    return response.data.external_id;
  };

  // Hydrates the values for all fields. This is required for fields whos' values need to be fetched asynchronously. Ex. Diagnoses data for a patient.
  /*const hydrateValues = async () => {
    const hydratedPromises = context.inputs.map(async (input) => {
      const value = await input.value();
      return {
        friendlyName: input.friendlyName,
        current: value,
        id: input.id,
        description: input.description,
        type: input.type,
        example: input.example,
      };
    });
    const hydrated = await Promise.all(hydratedPromises);
    setContext((context) => ({ ...context, hydratedInputs: hydrated }));
    return hydrated;
  };*/

  // gets hydrated fields, but does not fetch them again unless ignoreCache is true
  const getHydratedFields = async (fields: ScribeField[]) => {
    //if (context.hydratedInputs && !ignoreCache) return context.hydratedInputs;
    //return await hydrateValues();

    return fields.map((field, i) => ({
      friendlyName: field.label || "Unlabled Field",
      current: field.value,
      id: `${i}`,
      description:
        SCRIBE_PROMPT_MAP[field.type]?.prompt ||
        SCRIBE_PROMPT_MAP["default"]?.prompt,
      type: "string",
      example:
        SCRIBE_PROMPT_MAP[field.type]?.example ||
        SCRIBE_PROMPT_MAP["default"]?.example,
      options: field.options?.map((opt) => ({
        id: opt.value || "NONE",
        text: opt.text,
      })),
    }));
  };

  // updates the transcript and fetches a new AI response
  const handleUpdateTranscript = async (updatedTranscript: string) => {
    if (updatedTranscript === lastTranscript) return;
    if (!instanceId) throw Error("Cannot find scribe instance");
    setToReview(undefined);
    setLastTranscript(updatedTranscript);
    const res = await request(routes.updateScribe, {
      body: {
        status: "READY",
        transcript: updatedTranscript,
        ai_response: null,
      },
      pathParams: {
        external_id: instanceId,
      },
    });
    if (res.error || !res.data) throw Error("Error updating scribe instance");
    setStatus("THINKING");
    const fields = scrapeFields();
    const aiResponse = await getAIResponse(instanceId, fields);
    setStatus("REVIEWING");
    setToReview(getFieldsToReview(aiResponse, fields));
  };

  const handleStartRecording = () => {
    setToReview(undefined);
    resetRecording();
    timer.start();
    setStatus("RECORDING");
    startSegmentedRecording();
  };

  const handleStopRecording = async () => {
    timer.stop();
    timer.reset();
    setStatus("UPLOADING");
    stopSegmentedRecording();
    const fields = scrapeFields();
    const instanceId = await createScribeInstance(fields);
    setInstanceId(instanceId);
    setStatus("TRANSCRIBING");
    await getTranscript(instanceId);
    setStatus("THINKING");
    const aiResponse = await getAIResponse(instanceId, fields);
    setStatus("REVIEWING");
    setToReview(getFieldsToReview(aiResponse, fields));
  };

  const handleCancel = () => {
    setStatus("IDLE");
    setToReview(undefined);
  };

  return (
    <>
      <div
        className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-4 transition-all`}
      >
        <div
          className={`${status === "IDLE" ? "max-h-0 opacity-0" : "max-h-[300px]"} w-full overflow-hidden rounded-2xl ${status === "REVIEWING" && !(openEditTranscript || (toReview && !toReview.length)) ? "" : "border border-secondary-400"} bg-white transition-all delay-100`}
        >
          {status === "RECORDING" && (
            <div className="flex items-center justify-center p-4 py-10">
              <div className="text-center">
                <div className="text-xl font-black">{timer.time}</div>
                <p>We are hearing you...</p>
              </div>
            </div>
          )}
          {(status === "TRANSCRIBING" ||
            status === "UPLOADING" ||
            status === "THINKING") && (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-32">
                <Lottie animationData={animationData} loop autoPlay />
              </div>
              <div className="-translate-y-4 text-sm text-secondary-700">
                Copilot is thinking...
              </div>
            </div>
          )}
          {typeof lastTranscript !== "undefined" &&
            status === "REVIEWING" &&
            (openEditTranscript || (toReview && !toReview.length)) && (
              <div className="p-4 md:w-[300px]">
                {toReview && !toReview.length && (
                  <p className="mb-4 text-sm font-bold text-red-500">
                    We could not autofill any fields from what you said
                  </p>
                )}
                <div className="text-base font-semibold">
                  {t("transcript_information")}
                </div>

                <p className="mb-4 text-xs text-gray-800">
                  {t("transcript_edit_info")}
                </p>
                <TextAreaFormField
                  name="transcript"
                  disabled={status !== "REVIEWING"}
                  value={transcript}
                  onChange={(e) => setTranscript(e.value)}
                  errorClassName="hidden"
                  placeholder="Transcript"
                />
                <ButtonV2
                  loading={status !== "REVIEWING"}
                  disabled={transcript === lastTranscript}
                  className="mt-4 w-full"
                  onClick={() =>
                    transcript && handleUpdateTranscript(transcript)
                  }
                >
                  {t("process_transcript")}
                </ButtonV2>
                {!(toReview && !toReview.length) && (
                  <button
                    className="absolute right-4 top-4 text-xs text-gray-600 hover:text-gray-800"
                    onClick={() => setOpenEditTranscript(false)}
                  >
                    {t("close")}
                  </button>
                )}
              </div>
            )}
        </div>
        {typeof lastTranscript !== "undefined" &&
          status === "REVIEWING" &&
          !(openEditTranscript || (toReview && !toReview.length)) && (
            <button
              onClick={() => setOpenEditTranscript(true)}
              className="max-h-[100px] w-64 overflow-hidden rounded-lg bg-black/20 p-2 text-left text-sm text-white hover:bg-black/40"
            >
              {transcript}
            </button>
          )}
        <div className="flex items-center gap-2">
          {status === "REVIEWING" && (
            <button
              onClick={handleCancel}
              className="flex aspect-square h-full items-center justify-center rounded-full border border-secondary-400 bg-secondary-300 p-4 text-xl transition-all hover:bg-secondary-400"
              title={t("cancel")}
            >
              <CareIcon icon="l-times" />
            </button>
          )}
          <ScribeButton
            status={status}
            onClick={
              status !== "RECORDING"
                ? handleStartRecording
                : handleStopRecording
            }
          />
        </div>
      </div>
      {toReview && toReview.length && (
        <ScribeReview
          toReview={toReview}
          onReviewComplete={async (approvedFields) => {
            const approved = approvedFields.filter((a) => a.approved);
            approved && Notify.Success({ msg: "Autofilled fields" });
            setToReview(undefined);
            setStatus("IDLE");
          }}
        />
      )}
    </>
  );
}
