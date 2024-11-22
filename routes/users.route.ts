import { BackendError } from "errors";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { UserService } from "services/user.service";
import { userPatchBodyValidator } from "validators/user.patch-body.validator";
import { validate } from "validators/validate";

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
        if (validate(request.body).using(userPatchBodyValidator)) {
            if (request.payload.id === request.params.id) {
                await UserService.partialUpdateUser(request.params.id, request.body);
                reply.send(new HttpMessage("user.update"));
            } else {
                throw new BackendError("Forbidden");
            }
        }
    });
}