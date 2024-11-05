import { Schema, Types, model } from 'mongoose';

interface IThread {
    title: string;
    body: string;
    upvoted: Types.ObjectId[];
    downvoted: Types.ObjectId[];
    comments: Types.ObjectId[];
    author: Types.ObjectId;
    box: Types.ObjectId;
}

const ThreadSchema = new Schema<IThread>({
    title: { type: String, required: true, maxLength: 128 },
    body: { type: String, required: true },
    upvoted: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    downvoted: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    comments: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Comment'}],
        default: [],
    },
    author: { type: Schema.Types.ObjectId, ref: 'User'},
    box: { type: Schema.Types.ObjectId, ref: 'Box'},
}, {timestamps: true});

ThreadSchema.index({ title: 'text', body: 'text' });

export const Thread = model<IThread>('Thread', ThreadSchema);