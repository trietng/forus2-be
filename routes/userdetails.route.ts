import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { User } from "models/user";

export async function userdetailsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {    
    fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const user = await User.findById(request.payload.id, { _id: 0, displayName: 1, email: 1, description: 1, dateOfBirth: 1, createdAt: 1 });
        reply.send(user);
    });

    fastify.patch('/', { 
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string', minLength: 1, maxLength: 100 },
                    description: { type: 'string', maxLength: 512 },
                    dateOfBirth: { type: 'string', format: 'date-time' }
                },
            }
        }
    }, async (request, reply) => {
        await User.findByIdAndUpdate(request.payload.id, request.body);
        reply.send({ message: 'User details updated' });
    });
}