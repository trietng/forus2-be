import { Schema, Types, model } from 'mongoose';
import { ISoftDelete } from './common/soft-delete';
import { IVisibility } from './common/visibility';

export interface IComment extends ISoftDelete, IVisibility {
    body: string;
    upvoted: Types.ObjectId[];
    downvoted: Types.ObjectId[];
    author: Types.ObjectId;
    replyTo: Types.ObjectId;
    thread: Types.ObjectId;
}

const CommentSchema = new Schema<IComment>({
    body: { type: String, required: true, set: (str: string) => str === "" ? undefined : str },
    upvoted: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    downvoted: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User'}],
        default: [],
    },
    author: { type: Schema.Types.ObjectId, ref: 'User'},
    replyTo: { type: Schema.Types.ObjectId, ref: 'Comment'},
    thread: { type: Schema.Types.ObjectId, ref: 'Thread'},
    visibility: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false},
}, {timestamps: true});

export const Comment = model<IComment>('Comment', CommentSchema);

export const CommentPageSize = 10;