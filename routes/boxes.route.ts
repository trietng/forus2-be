import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { ThreadDto } from "dtos/request/thread.dto";
import { ThreadConstraints, ThreadPageSize, ThreadSortableField, ThreadSortableFieldSet } from "models/thread";
import { SortDirection, SortDirectionSet } from "models/common/sort-option";
import { BoxService } from "services/box.service";
import { Validator } from "validators/validator";
import { boxPatchBodyValidator } from "validators/box.patch-body.validator";
import { IdentityBuilder } from "utils/identity";
import { ThreadService } from "services/thread.service";

export async function boxesRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/:id/:page", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id", "page"],
                properties: {
                    id: { type: "string" },
                    page: { type: "number", minimum: 1 }
                }
            },
            querystring: {
                type: "object",
                properties: {
                    order: { type: "string", enum: ThreadSortableFieldSet, default: "createdAt" },
                    direction: { type: "string", enum: SortDirectionSet, default: "desc" }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string, page: number }, Querystring: { order: ThreadSortableField, direction: SortDirection } }>, reply) => {
        const sortOption = {
            field: request.query.order,
            direction: request.query.direction
        };
        const box = await BoxService.getBox(request.params.id, request.params.page, ThreadPageSize, sortOption, request.payload.id);
        const identity = IdentityBuilder.new().addPayload(request.payload).addModerators(box.moderators).build();
        if (!identity.hasRole("ROLE_ADMIN", true) && !identity.isModerator(true)) {
            box.threads = box.threads.filter((thread: any) => thread.visibility);
        }
        reply.send(box);
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
        if (Validator.validate(request.body).using(boxPatchBodyValidator)) {
            // if user is admin, continue
            const identityBuilder = IdentityBuilder.new().addPayload(request.payload);
            const identity = identityBuilder.build();
            if (identity.hasRole("ROLE_ADMIN", true)) {
                await BoxService.partialUpdateBox(request.params.id, request.body);
            } else {
                const box = await BoxService.getBoxById(request.params.id);
                const identity = identityBuilder.addTarget(box).addModerators(box.moderators).build();
                if (identity.isModerator() && identity.doesNotModifyField("name")) {
                    await BoxService.partialUpdateBox(request.params.id, request.body);
                }
            }
            reply.send(new HttpMessage("box.update"));
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
        await BoxService.deleteBox(request.params.id);
        reply.send(new HttpMessage("box.delete"));
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
        const thread = await ThreadService.createThread(request.params.id, request.body, request.payload.id);
        reply.status(201).send(thread);
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
        const result = await BoxService.subscribeBox(request.params.id, request.payload.id);
        reply.send(result);
    });
}