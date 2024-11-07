import { group } from "console";
import { BoxDto } from "dtos/request/box.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { Box, BoxConstraints } from "models/box";
import { User } from "models/user";
import{ Types } from "mongoose";

const THREADS_PER_PAGE = 10;

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
                        { $project: { _id: 1, fullname: 1, avatarUrl: 1 } },
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
                    threads: {
                        $push: {
                            $cond: {
                                if: { $and: [{ $eq: ["$threads.isDeleted", false] }, { $ne: ["$threads", {}] }] },
                                then: {
                                    _id: "$threads._id",
                                    title: "$threads.title",
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
                },
            },
        ]);
        if (box.length === 0 || (box[0].pageCount < page && box[0].pageCount !== 0)) {
            reply.status(404).send({ message: "Page not found" });
        } else {
            reply.send(box[0]);
        }
    });

    
}