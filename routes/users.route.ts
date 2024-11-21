import { BackendError } from "errors";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { User, UserConstraints } from "models/user";

function validatePatchBody(body: any): boolean {
    for (const key in body) {
        switch (key) {
            case 'displayName':
                if (typeof body.displayName !== 'string' || body.displayName.length < UserConstraints.displayName.minLength || body.displayName.length > UserConstraints.displayName.maxLength) {
                    return false;
                }
                break;
            case 'description':
                if (typeof body.description !== 'string' || body.description.length > UserConstraints.description.maxLength) {
                    return false;
                }
                break;
            case 'dateOfBirth':
                if (typeof body.dateOfBirth !== 'string') {
                    return false;
                }
                try {
                    new Date(body.dateOfBirth);
                }
                catch {
                    return false;
                }
                break;
            case 'avatarUrl':
                if (typeof body.avatarUrl !== 'string') {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}

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
        const user = await User.findById(request.params.id, { _id: 0, displayName: 1, email: 1, description: 1, dateOfBirth: 1, createdAt: 1 });
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
        if (validatePatchBody(request.body)) {
            if (request.payload.id === request.params.id) {
                const result = await User.findByIdAndUpdate(request.payload.id, request.body);
                if (!result) {
                    throw new BackendError("Resource not found");
                }
                reply.send(new HttpMessage("user.update"));
            } else {
                throw new BackendError("Forbidden");
            }
        }
        else {
            throw new BackendError("Bad request"); 
        }
    });
}