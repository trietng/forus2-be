import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import sharp from "sharp";
import { Readable } from "stream";
import caching from "@fastify/caching";
import { ResizeDto } from "dtos/request/resize.dto";

export async function resizeRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.register(caching, {
        privacy: caching.privacy.PUBLIC,
        expiresIn: 86400 // 1 day
    });

    fastify.get('/', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: {
                type: 'object',
                required: ['url', 'height'],
                properties: {
                    url: { type: 'string', format: 'uri' },
                    height: { type: 'integer', minimum: 1 }
                }
            }
        }
    }, async (request: FastifyRequest<{ Querystring: ResizeDto }>, reply) => {
        const originalReply = await fetch(request.query.url);
        const buffer = await sharp(await originalReply.arrayBuffer()).resize(null, request.query.height).toBuffer();
        // return a blob
        const stream = Readable.from(buffer);
        // set the headers
        reply.header('content-type', originalReply.headers.get('content-type'));
        // MUST return the stream
        return reply.send(stream);
    });
}