import { Schema, Types, model } from 'mongoose';

interface IComment {
    body: string;
    upvoted: Types.ObjectId[];
    downvoted: Types.ObjectId[];
    author: Types.ObjectId;
    replyTo: Types.ObjectId;
    box: Types.ObjectId;
    thread: Types.ObjectId;
}

const CommentSchema = new Schema<IComment>({
    body: { type: String, required: true, minLength: 1},
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
    box: { type: Schema.Types.ObjectId, ref: 'Box'},
    thread: { type: Schema.Types.ObjectId, ref: 'Thread'},
}, {timestamps: true});

export const Comment = model<IComment>('Comment', CommentSchema);