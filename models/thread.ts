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

export const ThreadConstraints: Partial<Record<keyof IThread, any>> = {
    title: {
        maxLength: 128
    },
}

const ThreadSchema = new Schema<IThread>({
    title: { type: String, required: true, maxLength: ThreadConstraints.title.maxLength, set: (str: string) => str === "" ? undefined : str },
    body: { type: String, required: true, set: (str: string) => str === "" ? undefined : str },
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