import {
  CreateFileRequest,
  CreateFileResponse,
  FileUploadModel,
} from "@/components/Patient/models";
import { Type } from "@/Redux/api";
import { ScribeModel } from "../types";

const routes = {
  createScribe: {
    path: "/api/care_scribe/scribe/",
    method: "POST",
    TReq: Type<ScribeModel>(),
    TRes: Type<ScribeModel>(),
  },
  getScribe: {
    path: "/api/care_scribe/scribe/{external_id}/",
    method: "GET",
    TRes: Type<ScribeModel>(),
  },
  updateScribe: {
    path: "/api/care_scribe/scribe/{external_id}/",
    method: "PUT",
    TReq: Type<ScribeModel>(),
    TRes: Type<ScribeModel>(),
  },
  createScribeFileUpload: {
    path: "/api/care_scribe/scribe_file/",
    method: "POST",
    TBody: Type<CreateFileRequest>(),
    TRes: Type<CreateFileResponse>(),
  },
  editScribeFileUpload: {
    path: "/api/care_scribe/scribe_file/{id}/?file_type={fileType}&associating_id={associatingId}",
    method: "PATCH",
    TBody: Type<Partial<FileUploadModel>>(),
    TRes: Type<FileUploadModel>(),
  },
} as const;

export default routes;
