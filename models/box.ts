import { Schema, Types, model } from 'mongoose';

interface IBox {
    name: string;
    description: string;
    moderators: Types.ObjectId[];
    bannedUsers: Types.ObjectId[];
    threads: Types.ObjectId[];
}

const BoxSchema = new Schema<IBox>({
    name: { type: String, required: true, unique: true, maxLength: 128, minLength: 1},
    description: { type: String, maxLength: 512, minLength: 32},
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
}, {timestamps: true});

BoxSchema.index({ name: 'text', description: 'text' });

export const Box = model<IBox>('Box', BoxSchema);