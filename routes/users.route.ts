import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { SortDirectionSet, SortDirection } from "models/common/sort-option";
import { ThreadSortableFieldSet, ThreadSortableField, ThreadPageSize } from "models/thread";
import { UserService } from "services/user.service";
import { IdentityBuilder } from "utils/identity";
import { userPatchBodyValidator } from "validators/user.patch-body.validator";
import { Validator } from "validators/validator";

export async function usersRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {    
    fastify.get('/:id', { 
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
        const user = await UserService.getUser(request.params.id);
        reply.send(user);
    });

    fastify.get('/:id/threads/:page', {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id", "page"],
                properties: {
                    id: { type: "string" },
                    page: { type: "number", minimum: 1 },
                }
            },
        }
    }, async (request: FastifyRequest<{ Params: { id: string, page: number } }>, reply) => {
        const identity = IdentityBuilder.new().addPayload(request.payload).build();
        if (identity.isMe(request.params.id)) {
            const threads = await UserService.getThreadsByUserId(request.params.id,  request.params.page);
            reply.send(threads);
        }
    });

    fastify.patch('/:id', { 
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
        // Manual validation
        if (Validator.validate(request.body).using(userPatchBodyValidator)) {
            const identity = IdentityBuilder.new().addPayload(request.payload).build();
            if (identity.isMe(request.params.id)) {
                await UserService.partialUpdateUser(request.params.id, request.body);
                reply.send(new HttpMessage("user.update"));
            }
        }
    });
}