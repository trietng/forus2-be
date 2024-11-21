import { Schema, Types, model } from 'mongoose';
import { ISoftDelete } from './extensions/soft-delete';
import { IVisibility } from './extensions/visibility';

interface IBox extends ISoftDelete, IVisibility {
    name: string;
    description: string;
    group: Types.ObjectId;
    moderators: Types.ObjectId[];
    bannedUsers: Types.ObjectId[];
    threads: Types.ObjectId[];
    subscribers: Types.ObjectId[];
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
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
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
    subscribers: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    visibility: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, {timestamps: true});

BoxSchema.index({ name: 'text', description: 'text' });

export const Box = model<IBox>('Box', BoxSchema);