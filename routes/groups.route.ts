import { GroupDto } from "dtos/request/group.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { Box } from "models/box";
import { Group, GroupConstraints } from "models/group";


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
                    as: 'boxes',
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
                                if: { $isArray: '$boxes.threads' },
                                then: {
                                    _id: '$boxes._id',
                                    name: '$boxes.name',
                                    description: '$boxes.description',
                                    threadCount: { $size: '$boxes.threads' },
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
                const group = await Group.findByIdAndUpdate(request.params.id, { isDeleted: true });
                // soft delete all boxes in the group
                await Box.updateMany({ _id: { $in: group.boxes } }, { isDeleted: true });
            });
            reply.send(new HttpMessage("group.delete"));
        }
        finally {
            session.endSession();
        }
    });
}