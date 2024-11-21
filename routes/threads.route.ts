import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { Thread } from "models/thread";

export async function threadsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.put("/:id/upvote", { 
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
    } , async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        let voteStatus = 0;
        const isUpvoted = await Thread.exists({ _id: request.params.id, upvoted: request.payload.id }); 
        if (isUpvoted) {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { upvoted: request.payload.id } });
        }
        else {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { downvoted: request.payload.id }, $push: { upvoted: request.payload.id } });
            voteStatus = 1;
        }
        reply.status(200).send({ voteStatus });
    });

    fastify.put("/:id/downvote", {
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
        let voteStatus = 0;
        const isDownvoted = await Thread.exists({ _id: request.params.id, downvoted: request.payload.id }); 
        if (isDownvoted) {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { downvoted: request.payload.id } });
        }
        else {
            await Thread.updateOne({ _id: request.params.id }, { $pull: { upvoted: request.payload.id }, $push: { downvoted: request.payload.id } });
            voteStatus = -1;
        }
        reply.status(200).send({ voteStatus });
    });
}