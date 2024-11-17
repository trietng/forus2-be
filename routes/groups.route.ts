import { BoxDto } from "dtos/request/box.dto";
import { GroupDto } from "dtos/request/group.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { Box, BoxConstraints } from "models/box";
import { Group, GroupConstraints } from "models/group";
import { Types } from "mongoose";

export async function groupsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/", { preHandler: [fastify.authenticate] }, async (_, reply) => {
        // get all groups with name and the thread count of each box
        const groups = await Group.aggregate([
            {
                $match: { isDeleted: false }
            },
            {
                $lookup: {
                    from: 'boxes',
                    localField: 'boxes',
                    foreignField: '_id',
                    as: 'boxes'
                }
            },
            {
                $unwind: {
                    path: '$boxes',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    boxes: { 
                        $push: {
                            $cond: {
                                // if the box is not null, then return the box with the thread count
                                if: { $and: [{ $isArray: '$boxes.threads' }, { $isArray: '$boxes.subscribers' }] },
                                then: {
                                    _id: '$boxes._id',
                                    name: '$boxes.name',
                                    description: '$boxes.description',
                                    status: '$boxes.status',
                                    threadCount: { $size: '$boxes.threads'},
                                    subscriberCount: { $size: '$boxes.subscribers' }
                                },
                                else: '$boxes'
                            }
                        }
                    },
                    createdAt: { $first: '$createdAt' }
                }
            },
            {
                $sort: { createdAt: 1 }
            }
        ]);
        reply.send(groups);
    });

    fastify.post("/", { 
        preHandler: [fastify.authenticate, fastify.isAdmin],
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', maxLength: GroupConstraints.name.maxLength },
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: GroupDto }>, reply) => {
        const group = new Group(request.body);
        await group.save();
        reply.status(201).send(group);
    });

    fastify.put("/:id", {
        preHandler: [fastify.authenticate, fastify.isAdmin],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', maxLength: GroupConstraints.name.maxLength },
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string }, Body: GroupDto }>, reply) => {
        const group = await Group.findOneAndUpdate({ _id: request.params.id, isDeleted: false }, request.body, { new: true });
        reply.send(group);
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
        const session = await Group.startSession();
        try {
            await session.withTransaction(async () => {
                const group = await Group.findByIdAndUpdate(request.params.id, { isDeleted: true }, { session: session });
                // soft delete all boxes in the group
                await Box.updateMany({ _id: { $in: group.boxes } }, { isDeleted: true }, { session: session });
            });
            reply.send(new HttpMessage("group.delete"));
        }
        finally {
            session.endSession();
        }
    });

    // create a new box in the group
    fastify.post("/:id/box", {
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
                required: ['name', 'description'],
                properties: {
                    name: { type: 'string', maxLength: BoxConstraints.name.maxLength },
                    description: { type: 'string', maxLength: BoxConstraints.description.maxLength }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: BoxDto, Params: { id: string } }>, reply) => {
        const session = await Box.startSession();
        try {
            await session.withTransaction(async () => {
                const box = new Box(request.body);
                box.group = new Types.ObjectId(request.params.id);
                await box.save({ session: session });
                // Add the box to the group
                await Group.findByIdAndUpdate(request.params.id, { $push: { boxes: box._id } }, { session: session });
                reply.status(201).send(box);
            });
        } finally {
            session.endSession();
        }
    });
}