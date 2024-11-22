import { BackendError } from "errors";
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { Box, IBox } from "models/box";
import { Thread } from "models/thread";
import { Types } from "mongoose";

const COMMENTS_PER_PAGE = 10;

function validatePatchBody(body: any): boolean {
    for (const key in body) {
        switch (key) {
            case 'body':
                if (typeof body.body !== 'string') {
                    return false;
                }
                break;
            case 'visibility':
                if (typeof body.visibility !== 'boolean') {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}

export async function threadsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/:id/:page", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id", "page"],
                properties: {
                    id: { type: "string" },
                    page: { type: "number" }
                }
            },
            querystring: {
                type: "object",
                properties: {
                    order: { type: "string", enum: ["createdAt", "updatedAt", "score", "commentCount", "title"] },
                    direction: { type: "string", enum: ["asc", "desc"] }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string, page: number }, Querystring: { order?: string, direction?: string } }>, reply) => {
        const userId = new Types.ObjectId(request.payload.id);
        const thread = await Thread.aggregate([
            { $match: { _id: new Types.ObjectId(request.params.id), isDeleted: false } },
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
                                            if: { $in: [userId, '$comments.upvoted'] },
                                            then: 1,
                                            else: {
                                                $cond: {
                                                    if: { $in: [userId, '$comments.downvoted'] },
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
                            if: { $in: [userId, '$upvoted'] },
                            then: 1,
                            else: {
                                $cond: {
                                    if: { $in: [userId, '$downvoted'] },
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
                                COMMENTS_PER_PAGE
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
                            (request.params.page - 1) * COMMENTS_PER_PAGE,
                            COMMENTS_PER_PAGE
                        ],
                    },
                }
            }
        ]);
        if (thread[0].pageCount === 0) {
            thread[0].pageCount = 1;
        } else if (thread[0].pageCount < request.params.page) {
            throw new BackendError("Resource not found");
        }
        reply.send(thread[0]);
    });
    
    fastify.patch("/:id", { 
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        // Manual validation
        if (validatePatchBody(request.body)) {
            // if user is admin, continue
            if (request.payload.role === "ROLE_ADMIN") {
                const result = await Thread.findByIdAndUpdate(request.params.id, request.body);
                if (!result) {
                    throw new BackendError("Resource not found");
                }
            } else { // TODO: add patch op for body (only the author can do this)
                const thread = await Thread.findById(request.params.id).populate<{ box: IBox }>("box", { moderators: 1 });
                if (!thread) {
                    throw new BackendError("Resource not found");
                }
                if (thread.box.moderators.includes(new Types.ObjectId(request.payload.id))) {
                    if (Object.keys(request.body).includes("body")) {
                        throw new BackendError("Forbidden");
                    } else {
                        thread.set(request.body);
                        await thread.save();
                    }
                } else {
                    throw new BackendError("Forbidden");
                }
            }
            reply.send(new HttpMessage("thread.update"));
        } else {
            throw new BackendError("Bad request");
        }
    });

    fastify.delete("/:id", { 
        preHandler: [fastify.authenticate, fastify.isAdmin],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const session = await Thread.startSession();
        try {
            await session.withTransaction(async () => {
                const thread = await Thread.findByIdAndUpdate(request.params.id, { isDeleted: true }, { session: session });
                // remove thread from box
                await Box.updateOne({ _id: thread.box }, { $pull: { threads: thread._id } }, { session: session });
            });
            reply.send(new HttpMessage("thread.delete"));
        }
        finally {
            session.endSession();
        }
    });

    fastify.put("/:id/upvote", { 
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string" },
                }
            }
        }
    } , async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        let voteStatus = 0;
        const thread = await Thread.findOne({ _id: request.params.id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isUpvoted = thread.upvoted.includes(new Types.ObjectId(request.payload.id));
        if (isUpvoted) {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { upvoted: request.payload.id } });
        }
        else {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { downvoted: request.payload.id }, $push: { upvoted: request.payload.id } });
            voteStatus = 1;
        }
        reply.send({ voteStatus });
    });

    fastify.put("/:id/downvote", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string" },
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        let voteStatus = 0;
        const thread = await Thread.findOne({ _id: request.params.id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isDownvoted = thread.downvoted.includes(new Types.ObjectId(request.payload.id));
        if (isDownvoted) {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { downvoted: request.payload.id } });
        }
        else {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { upvoted: request.payload.id }, $push: { downvoted: request.payload.id } });
            voteStatus = -1;
        }
        reply.send({ voteStatus });
    });
}