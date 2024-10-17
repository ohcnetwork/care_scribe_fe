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