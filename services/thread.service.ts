import { ThreadDto } from "dtos/request/thread.dto";
import { BackendError } from "errors";
import { Box, IBox } from "models/box";
import { Thread } from "models/thread";
import { Types } from "mongoose";

export class ThreadService {
    static async getThreadByIdWithBox(id: string) {
        const result = await Thread.findOne({ _id: id, isDeleted: false }).populate<{ box: IBox }>("box", { moderators: 1 });
        if (!result) {
            throw new BackendError("Resource not found");
        }
        return result;
    }

    static async getThread(id: string, page: number, limit: number, userId: string) {
        const userObjectId = new Types.ObjectId(userId);
        const thread = await Thread.aggregate([
            { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
            {                    
                $lookup: {
                    from: 'boxes',
                    localField: 'box',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, group: 1 } }
                    ],
                    as: 'box'
                }
            },
            {
                $unwind: "$box"
            },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'box.group',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1 } }
                    ],
                    as: 'box.group'
                }
            },
            {
                $unwind: "$box.group"
            },
            {                    
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'thread',
                    as: 'comments'
                }
            },
            {
                $unwind: {
                    path: "$comments",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { "id": "$comments.author" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                        { $project: { _id: 1, fullname: 1, avatarUrl: 1 } }
                    ],
                    as: "comments.author",
                },
            },
            {
                $unwind: {
                    path: "$comments.author",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    let: { "replyTo": "$comments.replyTo" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$replyTo"] } } },
                        {
                            $lookup: {
                                from: "users",
                                let: { "id": "$author" },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                                    { $project: { _id: 1, fullname: 1 } }
                                ],
                                as: "author"
                            }
                        },
                        {
                            $unwind: {
                                path: "$author",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: 'comments.reply'
                }
            },
            {
                $unwind: {
                    path: "$comments.reply",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { "id": "$author" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                        { $project: { _id: 1, displayName: 1, avatarUrl: 1, role: 1 } }
                    ],
                    as: "author",
                },
            },    
            {
                $group: {
                    _id: '$_id',
                    title: { $first: '$title' },
                    box: { $first: '$box' },
                    body: { $first: '$body' },
                    author: { $first: '$author' },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $first: '$updatedAt' },
                    upvoted: { $first: '$upvoted' },
                    downvoted: { $first: '$downvoted' },
                    voteStatus: { $first: '$voteStatus' },
                    visibility: { $first: '$visibility' },
                    comments: { 
                        $push: {
                            $cond: {
                                if: { $ne: ['$comments', {}] },
                                then: {
                                    _id: '$comments._id',
                                    author: '$comments.author',
                                    body: '$comments.body',
                                    visibility: '$comments.visibility',
                                    createdAt: '$comments.createdAt',
                                    updatedAt: '$comments.updatedAt',
                                    replyTo: '$comments.replyTo',
                                    reply: {
                                        $cond: {
                                            if: { $ne: ['$comments.reply', {}] },
                                            then: '$comments.reply',
                                            else: '$$REMOVE'
                                        }
                                    },
                                    score: {
                                        $subtract: [
                                            { $size: '$comments.upvoted' },
                                            { $size: '$comments.downvoted' }
                                        ]
                                    },
                                    voteStatus: {
                                        $cond: {
                                            if: { $in: [userObjectId, '$comments.upvoted'] },
                                            then: 1,
                                            else: {
                                                $cond: {
                                                    if: { $in: [userObjectId, '$comments.downvoted'] },
                                                    then: -1,
                                                    else: 0
                                                }
                                            }
                                        }
                                    }
                                },
                                else: '$$REMOVE'
                            }
                        }
                    },
                }
            },              
            {
                $addFields: {
                    createdAt: "$createdAt",
                    updatedAt: "$updatedAt",
                    score: {
                        $subtract: [
                            { $size: '$upvoted' },
                            { $size: '$downvoted'}
                        ]
                    },
                    commentCount: { $size: '$comments' },
                    voteStatus: {
                        $cond: {
                            if: { $in: [userObjectId, '$upvoted'] },
                            then: 1,
                            else: {
                                $cond: {
                                    if: { $in: [userObjectId, '$downvoted'] },
                                    then: -1,
                                    else: 0
                                }
                            }
                        }
                    },
                    pageCount: {
                        $ceil: {
                            $divide: [
                                { $size: '$comments' },
                                limit
                            ]
                        }
                    },
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    author: { $arrayElemAt: ['$author', 0] },
                    body: 1,
                    box: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    visibility: 1,
                    score: 1,
                    commentCount: 1,
                    voteStatus: 1,
                    pageCount: 1,
                    comments: {
                        $slice: [
                            {
                                $sortArray: {
                                    input: "$comments",
                                    sortBy: { createdAt: 1 }
                                }
                            },
                            (page - 1) * limit,
                            limit
                        ],
                    },
                }
            }
        ]);
        if (thread[0].pageCount === 0) {
            thread[0].pageCount = 1;
        } else if (thread[0].pageCount < page) {
            throw new BackendError("Resource not found");
        }
        return thread[0];
    }

    static async createThread(boxId: string, threadDto: ThreadDto, authorId: string) {
        const session = await Thread.startSession();
        try {
            const thread = new Thread({
                title: threadDto.title,
                body: threadDto.body,
                author: authorId,
                box: boxId
            });
            await session.withTransaction(async () => {
                await thread.save({ session: session });
                // Add the box to the group
                const result = await Box.findOneAndUpdate({ _id: boxId, isDeleted: false }, { $push: { threads: thread._id } }, { session: session });
                if (!result) {
                    throw new BackendError("Resource not found");
                }
            });
            return thread;
        } finally {
            session.endSession();
        }
    }

    static async partialUpdateThread(thread: any, patchBody: any) {
        thread.set(patchBody);
        await thread.save();
    }

    static async deleteThread(id: string) {
        const session = await Thread.startSession();
        try {
            await session.withTransaction(async () => {
                const thread = await Thread.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { session: session });
                if (!thread) {
                    throw new BackendError("Resource not found");
                }
                // remove thread from box
                await Box.updateOne({ _id: thread.box }, { $pull: { threads: thread._id } }, { session: session });
            });
        }
        finally {
            session.endSession();
        }
    }

    static async upvoteThread(id: string, userId: string) {
        let voteStatus = 0;
        const thread = await Thread.findOne({ _id: id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isUpvoted = thread.upvoted.includes(new Types.ObjectId(userId));
        if (isUpvoted) {
            await Thread.updateOne({ _id: id }, { $pull: { upvoted: userId } });
        }
        else {
            await Thread.updateOne({ _id: id }, { $pull: { downvoted: userId }, $push: { upvoted: userId } });
            voteStatus = 1;
        }
        return { voteStatus };
    }

    static async downvoteThread(id: string, userId: string) {
        let voteStatus = 0;
        const thread = await Thread.findOne({ _id: id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isDownvoted = thread.downvoted.includes(new Types.ObjectId(userId));
        if (isDownvoted) {
            await Thread.updateOne({ _id: id }, { $pull: { downvoted: userId } });
        }
        else {
            await Thread.updateOne({ _id: id }, { $pull: { upvoted: userId }, $push: { downvoted: userId } });
            voteStatus = -1;
        }
        return { voteStatus };
    }
}