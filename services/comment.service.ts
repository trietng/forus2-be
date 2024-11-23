import { CommentDto } from "dtos/request/comment.dto";
import { BackendError } from "errors";
import { Comment } from "models/comment";
import { IThread, Thread } from "models/thread";
import { Types } from "mongoose";

export class CommentService {
    static async getCommentByIdWithBox(id: string) {
        const result = await Comment.findOne({ _id: id, isDeleted: false }).populate<{ 
            thread: IThread & { box: { moderators: Types.ObjectId[] } }
        }>({
            path: 'thread',
            populate: {
                path: 'box',
                model: 'Box',
                select: 'moderators'
            },
            select: 'box'
        });
        if (!result) {
            throw new BackendError("Resource not found");
        }
        return result;
    }

    static async createComment(threadId: string, commentDto: CommentDto, authorId: string) {
        const session = await Comment.startSession();
        try {
            const comment = new Comment({
                body: commentDto.body,
                author: authorId,
                thread: threadId,
            });
            await session.withTransaction(async () => {
                await comment.save({ session: session });
                // Add the comment to the thread
                const result = await Thread.findOneAndUpdate({ _id: threadId, isDeleted: false }, { $push: { comments: comment._id } }, { session: session });
                if (!result) {
                    throw new BackendError("Resource not found");
                }
            });
            return comment;
        } finally {
            session.endSession();
        }
    }

    static async partialUpdateComment(comment: any, patchBody: any) {
        comment.set(patchBody);
        await comment.save();
    }

    static async deleteComment(comment: any) {
        const session = await Comment.startSession();
        try {
            comment.isDeleted = true;
            await session.withTransaction(async () => {
                await comment.save({ session: session });
                // remove thread from box
                await Thread.updateOne({ _id: comment.thread }, { $pull: { comments: comment._id } }, { session: session });
            });
        }
        finally {
            session.endSession();
        }
    }

    static async upvoteComment(id: string, userId: string) {
        let voteStatus = 0;
        const comment = await Comment.findOne({ _id: id, isDeleted: false });
        if (!comment) {
            throw new BackendError("Resource not found");
        }
        const isUpvoted = comment.upvoted.includes(new Types.ObjectId(userId));
        if (isUpvoted) {
            await Comment.updateOne({ _id: id }, { $pull: { upvoted: userId } });
        }
        else {
            await Comment.updateOne({ _id: id }, { $pull: { downvoted: userId }, $push: { upvoted: userId } });
            voteStatus = 1;
        }
        return { voteStatus };
    }

    static async downvoteComment(id: string, userId: string) {
        let voteStatus = 0;
        const comment = await Comment.findOne({ _id: id, isDeleted: false });
        if (!comment) {
            throw new BackendError("Resource not found");
        }
        const isDownvoted = comment.downvoted.includes(new Types.ObjectId(userId));
        if (isDownvoted) {
            await Comment.updateOne({ _id: id }, { $pull: { downvoted: userId } });
        }
        else {
            await Comment.updateOne({ _id: id }, { $pull: { upvoted: userId }, $push: { downvoted: userId } });
            voteStatus = -1;
        }
        return { voteStatus };
    }
}