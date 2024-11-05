import { Schema, Types, model } from 'mongoose';
import { ISoftDelete } from './extensions/soft-delete';
import { ContentStatusSet, IContent } from './extensions/content';

interface IBox extends ISoftDelete, IContent {
    name: string;
    description: string;
    moderators: Types.ObjectId[];
    bannedUsers: Types.ObjectId[];
    threads: Types.ObjectId[];
}

export const BoxConstraints: Partial<Record<keyof IBox, any>> = {
    name: {
        maxLength: 128,
    },
    description: {
        maxLength: 512
    },
}

const BoxSchema = new Schema<IBox>({
    name: { type: String, required: true, unique: true, maxLength: BoxConstraints.name.maxLength },
    description: { type: String, maxLength: BoxConstraints.description.maxLength, default: '' },
    moderators: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    bannedUsers: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    threads: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Thread'}],
        default: [],
    },
    status: { type: String, enum: ContentStatusSet, default: "pending" },
    isDeleted: { type: Boolean, default: false }
}, {timestamps: true});

BoxSchema.index({ name: 'text', description: 'text' });

export const Box = model<IBox>('Box', BoxSchema);