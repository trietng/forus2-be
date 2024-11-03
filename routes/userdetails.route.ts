import { FastifyInstance, FastifyPluginOptions } from "fastify";
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

export async function userdetailsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {    
    fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const user = await User.findById(request.payload.id, { _id: 0, displayName: 1, email: 1, description: 1, dateOfBirth: 1, createdAt: 1 });
        reply.send(user);
    });

    fastify.patch('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        // Manual validation
        if (validatePatchBody(request.body)) {
            await User.findByIdAndUpdate(request.payload.id, request.body);
            reply.send({ message: 'User details updated' });
        }
        else {
            reply.status(400).send({ message: 'Invalid user details update request' });
        }
    });
}