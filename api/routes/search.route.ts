import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { SortDirectionSet } from "api/models/common/sort-option";
import { SearchQuery, SearchTypeSet } from "api/models/common/search";
import { Validator } from "api/validators/validator";
import { searchOrderValidator } from "api/validators/search.validator";
import { SearchService } from "api/services/search.service";

export async function searchRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    // fastify.register(caching, {
    //     privacy: caching.privacy.PUBLIC,
    //     expiresIn: parseInt(process.env.CACHE_DURATION_SEARCH) // 4 hours
    // });

    fastify.get('/:page', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: {
                type: 'object',
                required: ['q', 'type', 'direction'],
                properties: {
                    q: { type: 'string' },
                    type: { type: 'string', enum: SearchTypeSet },
                    order: { type: 'string' },
                    direction: { type: 'string', enum: SortDirectionSet }
                }
            },
            params: {
                type: 'object',
                required: ['page'],
                properties: {
                    page: { type: 'number', minimum: 1 }
                }
            }
        }
    }, async (request: FastifyRequest<{ Querystring: SearchQuery, Params: { page: number } }>, reply) => {
        if (Validator.validate(request.query).using(searchOrderValidator)) {
            const result = await SearchService.search(request.query, request.params.page, request.payload.id);
            reply.send(result);
        }
    });
}