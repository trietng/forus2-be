import { BoxDto } from "dtos/request/box.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { Box, BoxConstraints } from "models/box";

export async function boxesRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/", async (_, reply) => {
        reply.send({ message: 'Hello, boxes!' });
    });

    
}