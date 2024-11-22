import { Schema, Types, model } from 'mongoose';
import { ISoftDelete } from './common/soft-delete';
import { IVisibility } from './common/visibility';
import { ISortOption } from './common/sort-option';

export interface IThread extends ISoftDelete, IVisibility {
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
    visibility: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
}, {timestamps: true});

ThreadSchema.index({ title: 'text', body: 'text' });

export const Thread = model<IThread>('Thread', ThreadSchema);

export const ThreadSortableFieldSet = <const> ["createdAt", "updatedAt", "score", "commentCount", "title"]
export type ThreadSortableField = typeof ThreadSortableFieldSet[number];
export type ThreadSortOption = ISortOption<ThreadSortableField>;

export const ThreadPageSize = 10;