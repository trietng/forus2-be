import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import caching from "@fastify/caching";
import { ResizeDto } from "dtos/request/resize.dto";
import { ResizeService } from "services/resize.service";

export async function resizeRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.register(caching, {
        privacy: caching.privacy.PUBLIC,
        expiresIn: parseInt(process.env.CACHE_DURATION_RESIZE) // 1 day
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
        const [stream, header] = await ResizeService.resizeImage(request.query.url, request.query.height);
        // set the headers
        reply.header('content-type', header);
        // MUST return the stream
        return reply.send(stream);
    });
}