import { BoxDto } from "dtos/request/box.dto";
import { GroupDto } from "dtos/request/group.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { BoxConstraints } from "models/box";
import { Group, GroupConstraints } from "models/group";
import { BoxService } from "services/box.service";
import { GroupService } from "services/group.service";

export async function groupsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/", { preHandler: [fastify.authenticate] }, async (_, reply) => {
        const groups = await GroupService.getGroups();
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
        const group = await GroupService.createGroup(request.body);
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
        await GroupService.deleteGroup(request.params.id);
        reply.send(new HttpMessage("group.delete"));
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
        const box = await BoxService.createBox(request.params.id, request.body);
        reply.status(201).send(box);
    });
}