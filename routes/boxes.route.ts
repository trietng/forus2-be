import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { Box, BoxConstraints } from "models/box";
import { User } from "models/user";
import { Group } from "models/group";
import { HttpMessage } from "messages";
import { BackendError } from "errors";
import { ThreadDto } from "dtos/request/thread.dto";
import { Thread, ThreadConstraints } from "models/thread";
import { subscribe } from "diagnostics_channel";

const THREADS_PER_PAGE = 2;

function validatePatchBody(body: any): boolean {
    for (const key in body) {
        switch (key) {
            case 'name':
                if (typeof body.name !== 'string' || body.name.length < BoxConstraints.name.minLength || body.name.length > BoxConstraints.name.maxLength) {
                    return false;
                }
                break;
            case 'description':
                if (typeof body.description !== 'string' || body.description.length > BoxConstraints.description.maxLength) {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}

export async function boxesRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
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
        let id = request.params.id;
        let page = isNaN(request.params.page) ? 1 : request.params.page;
        let order = request.query.order || "createdAt";
        let direction = request.query.direction === "asc" ? 1 : -1;
        let box: any[];
        const user = await User.findById(request.payload.id);
        box = await Box.aggregate([
            // Match the box and not deleted
            { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
            // lookup group
            {
                $lookup: {
                    from: "groups",
                    localField: "group",
                    foreignField: "_id",
                    as: "group",
                },
            },
            {
                $unwind: "$group",
            },
            {
                $lookup: {
                    from: "threads",
                    localField: "threads",
                    foreignField: "_id",
                    as: "threads",
                },
            },
            {
                $unwind: {
                    path: "$threads",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { id: "$threads.author" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                        { $project: { _id: 1, displayName: 1, avatarUrl: 1 } },
                    ],
                    as: "threads.author",
                },
            },
            {
                $unwind: {
                    path: "$threads.author",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    description: { $first: "$description" },
                    group: { $first: "$group" },
                    subscribers: { $first: "$subscribers" },
                    moderators: { $first: "$moderators" },
                    threads: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$threads", {}] },
                                then: {
                                    _id: "$threads._id",
                                    title: "$threads.title",
                                    body: "$threads.body",
                                    author: "$threads.author",
                                    score: {
                                        $subtract: [
                                            { $size: "$threads.upvoted" },
                                            { $size: "$threads.downvoted" },
                                        ],
                                    },
                                    commentCount: { $size: "$threads.comments" },
                                    voteStatus: {
                                        $cond: {
                                            if: { $in: [user._id, "$threads.upvoted"] },
                                            then: 1,
                                            else: {
                                                $cond: {
                                                    if: { $in: [user._id, "$threads.downvoted"] },
                                                    then: -1,
                                                    else: 0,
                                                },
                                            },
                                        },
                                    },
                                    createdAt: "$threads.createdAt",
                                    updatedAt: "$threads.updatedAt",
                                },
                                else: "$$REMOVE"
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    pageCount: {
                        $ceil: {
                            $divide: [{ $size: "$threads" }, THREADS_PER_PAGE],
                        },
                    },
                    subscriberCount: { $size: "$subscribers" },
                    threadCount: { $size: "$threads" },
                    subscriberStatus: {
                        $cond: {
                            if: { $in: [user._id, "$subscribers"] },
                            then: true,
                            else: false,
                        },
                    }
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    pageCount: 1,
                    group: {
                        _id: 1,
                        name: 1
                    },
                    moderators: 1,
                    threads: {
                        $slice: [
                            {
                                $sortArray: {
                                    input: "$threads",
                                    sortBy: { [order]: direction },
                                },
                            },
                            (page - 1) * THREADS_PER_PAGE,
                            THREADS_PER_PAGE
                        ]
                    },
                    threadCount: 1,
                    subscriberCount: 1,
                    subscriberStatus: 1
                },
            },
        ]);
        if (box.length === 0 || (box[0].pageCount < page && box[0].pageCount !== 0)) {
            reply.status(404).send({ message: "Page not found" });
        } else {
            reply.send(box[0]);
        }
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
                await Box.findByIdAndUpdate(request.params.id, request.body);
            } else {
                const box = await Box.findById(request.params.id);
                if (box.moderators.includes(new Types.ObjectId(request.payload.id))) {
                    if (Object.keys(request.body).includes("name")) {
                        throw new BackendError("Forbidden");
                    } else {
                        await Box.findByIdAndUpdate(request.params.id, request.body);
                    }
                }

            }
            reply.send({ message: 'User details updated' });
        }
        else {
            reply.status(400).send({ message: 'Invalid user details update request' });
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
        const session = await Box.startSession();
        try {
            await session.withTransaction(async () => {
                const box = await Box.findByIdAndUpdate(request.params.id, { isDeleted: true }, { session: session });
                // remove box from group
                await Group.updateOne({ _id: box.group }, { $pull: { boxes: box._id } }, { session: session });
            });
            reply.send(new HttpMessage("box.delete"));
        }
        finally {
            session.endSession();
        }
    });

    fastify.post("/:id/thread", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                required: ['title', 'body'],
                properties: {
                    title: { type: 'string', maxLength: ThreadConstraints.title.maxLength },
                    body: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: ThreadDto, Params: { id: string } }>, reply) => {
        const session = await Thread.startSession();
        try {
            await session.withTransaction(async () => {
                const thread = new Thread({
                    title: request.body.title,
                    body: request.body.body,
                    author: request.payload.id,
                    box: request.params.id
                });
                await thread.save({ session: session });
                // Add the box to the group
                await Box.findByIdAndUpdate(request.params.id, { $push: { threads: thread._id } }, { session: session });
                reply.status(201).send(thread);
            });
        } finally {
            session.endSession();
        }
    });

    fastify.put("/:id/subscribe", {
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
        const isSubscribed = await Box.exists({ _id: request.params.id, subscribers: request.payload.id });
        const session = await Box.startSession();
        try {
            await session.withTransaction(async () => {
                if (isSubscribed) {
                    await Box.updateOne({ _id: request.params.id }, { $pull: { subscribers: request.payload.id } }, { session: session });
                    await User.updateOne({ _id: request.payload.id }, { $pull: { subscribedBoxes: request.params.id } }, { session: session });
                } else {
                    await Box.updateOne({ _id: request.params.id }, { $push: { subscribers: request.payload.id } }, { session: session });
                    await User.updateOne({ _id: request.payload.id }, { $push: { subscribedBoxes: request.params.id } }, { session: session });
                }
            });
            reply.status(200).send({ subscriberStatus: !isSubscribed });
        } finally {
            session.endSession();
        }
    });
}