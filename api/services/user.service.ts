import { BackendError } from "api/errors";
import { Comment, CommentPageSize } from "api/models/comment";
import { Thread, ThreadPageSize } from "api/models/thread";
import { User } from "api/models/user";
import { Types } from "mongoose";

export class UserService {
    static async getUser(id: string) {
        // Get user from database
        return await User.findById(id, { _id: 0, displayName: 1, email: 1, description: 1, dateOfBirth: 1, createdAt: 1 });
    }

    static async partialUpdateUser(id: string, patchBody: any) {
        const result = await User.findByIdAndUpdate(id, patchBody);
        if (!result) {
            throw new BackendError("Resource not found");
        }
    }
    
    static async getThreadsByUserId(id: string, page: number) {
        const userObjectId = new Types.ObjectId(id);
        const totalResults = await Thread.countDocuments({ author: userObjectId, isDeleted: false });
        const totalPages = Math.ceil(totalResults / ThreadPageSize); 
        const nextPage = page < totalPages ? page + 1 : null;
        const threads = await Thread.aggregate([
            { $match: { author: userObjectId, isDeleted: false } },
            {
                $lookup: {
                    from: 'boxes',
                    localField: 'box',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, moderators: 1 } }
                    ],
                    as: 'box'
                }
            },
            {
                $unwind: "$box"
            },
            {
                $lookup: {
                    from: "comments",
                    let: { localComments: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$localComments"]
                                }
                            }
                        }
                    ],
                    as: "comments"
                },
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
                    comments: { $push: '$comments' }
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
                    commentCount: {
                        $cond: {
                            if: { $ne: ['$comments', {}] },
                            then: { $size: '$comments' },
                            else: 0
                        }
                    },
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
                    voteStatus: 1
                }
            },
            { $sort: { createdAt: -1 } },
            // slice
            { $skip: (page - 1) * ThreadPageSize },
            { $limit: ThreadPageSize }
        ]);
        return { next: nextPage, results: threads };
    }

    static async getCommentsByUserId(id: string, page: number) {
        const userObjectId = new Types.ObjectId(id);
        const totalResults = await Comment.countDocuments({ author: userObjectId, isDeleted: false });
        const totalPages = Math.ceil(totalResults / CommentPageSize); 
        const nextPage = page < totalPages ? page + 1 : null;
        const comments = await Comment.aggregate([
            { $match: { author: userObjectId, isDeleted: false } },
            {
                $group: {
                    _id: '$_id',
                    body: { $first: '$body' },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $first: '$updatedAt' },
                    upvoted: { $first: '$upvoted' },
                    downvoted: { $first: '$downvoted' },
                    voteStatus: { $first: '$voteStatus' },
                    visibility: { $first: '$visibility' }
                }
            },              
            {
                $addFields: {
                    score: {
                        $subtract: [
                            { $size: '$upvoted' },
                            { $size: '$downvoted'}
                        ]
                    },
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
                }
            },
            {
                $project: {
                    _id: 1,
                    body: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    visibility: 1,
                    score: 1,
                    voteStatus: 1
                }
            },
            { $sort: { createdAt: -1 } },
            // slice
            { $skip: (page - 1) * CommentPageSize },
            { $limit: CommentPageSize }
        ]);
        return { next: nextPage, results: comments };
    }

    static async getSubscribedBoxesByUserId(id: string) {

    }
}