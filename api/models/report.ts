import { model, Schema, Types } from "mongoose";
import { ContentType, ContentTypeSet } from "./common/content";

export interface IReport {
    contentId: Types.ObjectId;
    contentType: ContentType;
    reason: string;
    author: Types.ObjectId;
}

const ReportSchema = new Schema<IReport>({
    contentId: { type: Schema.Types.ObjectId, required: true },
    contentType: { type: String, required: true, enum: ContentTypeSet },
    reason: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, required: true }
});


export const Report = model<IReport>("Report", ReportSchema);

export const ReportPageSize = 10;