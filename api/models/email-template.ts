import { Schema, Types, model } from 'mongoose';
import { IVisibility } from './common/visibility';

export interface IEmailTemplate extends IVisibility {
    name: string;
    body: string;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>({
    name: { type: String, required: true },
    body: { type: String, required: true },
    visibility: { type: Boolean, required: true, default: true }
});

export const EmailTemplate = model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
export const EmailTemplatePageSize = 10;
export const EmailTemplateNames = {
    VerifyEmail: 'Verify email',
    ResetPassword: 'Reset password'
}