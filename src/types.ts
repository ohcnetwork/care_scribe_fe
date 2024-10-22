import { UserModel } from "@/Components/Users/models";

export type ScribeModel = {
    external_id: string;
    requested_by: UserModel;
    form_data: {
        friendlyName: string;
        default: string;
        description: string;
        example: string;
        id: string;
        options?: any[];
        type: string;
    }[];
    transcript: string;
    ai_response: string;
    status:
    | "CREATED"
    | "READY"
    | "GENERATING_TRANSCRIPT"
    | "GENERATING_AI_RESPONSE"
    | "COMPLETED"
    | "FAILED";
};

export type ScribeStatus =
    | "FAILED"
    | "IDLE"
    | "RECORDING"
    | "UPLOADING"
    | "TRANSCRIBING"
    | "THINKING"
    | "REVIEWING"
    | "SCRIBING";

export type ScribeFieldOption = {
    value: string,
    text: string
}

export type ScribeFieldTypes = "string" | "number" | "date" | "datetime-local" | "select" | "cui-select" | "radio" | "checkbox"

export type ScribeField = {
    type: ScribeFieldTypes
    fieldElement: Element,
    label: string;
    options?: ScribeFieldOption[];
    value: string | null;
    customPrompt?: string,
    customExample?: string
}

export type ScribeAIResponse = {
    [field_number: number]: unknown
}

export type ScribeFieldSuggestion = ScribeField & { newValue: unknown }

export type ScribeFieldReviewedSuggestion = ScribeFieldSuggestion & { suggestionIndex: number, approved?: boolean }