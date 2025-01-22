import { ContentTypeSet } from "api/models/common/content";
import { IReport } from "api/models/report";
import { ReportService } from "api/services/report.service";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";

export async function reportsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get('/:page', {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    page: { type: "number", minimum: 1 }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { page: number } }>, reply) => {
        const reports = await ReportService.getReports(request.params.page);
        reply.send(reports);
    });

    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['contentType', 'contentId', 'reason'],
                properties: {
                    contentType: { type: 'string', enum: ContentTypeSet },
                    contentId: { type: 'string' },
                    reason: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: IReport }>, reply) => {

    });
}