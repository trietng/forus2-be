import { FastifyInstance, FastifyPluginOptions } from "fastify";

export async function pingRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/", async (_, reply) => {
        reply.send("pong");
    });
}