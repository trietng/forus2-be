import { BackendError } from "errors";
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { Box, IBox } from "models/box";
import { Thread } from "models/thread";
import { Types } from "mongoose";

function validatePatchBody(body: any): boolean {
    for (const key in body) {
        switch (key) {
            case 'body':
                if (typeof body.body !== 'string') {
                    return false;
                }
                break;
            case 'visibility':
                if (typeof body.visibility !== 'boolean') {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}

export async function threadsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.patch("/:id", { 
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        // Manual validation
        if (validatePatchBody(request.body)) {
            // if user is admin, continue
            if (request.payload.role === "ROLE_ADMIN") {
                const result = await Thread.findByIdAndUpdate(request.params.id, request.body);
                if (!result) {
                    throw new BackendError("Resource not found");
                }
            } else { // TODO: add patch op for body (only the author can do this)
                const thread = await Thread.findById(request.params.id).populate<{ box: IBox }>("box", { moderators: 1 });
                if (!thread) {
                    throw new BackendError("Resource not found");
                }
                if (thread.box.moderators.includes(new Types.ObjectId(request.payload.id))) {
                    if (Object.keys(request.body).includes("body")) {
                        throw new BackendError("Forbidden");
                    } else {
                        thread.set(request.body);
                        await thread.save();
                    }
                } else {
                    throw new BackendError("Forbidden");
                }
            }
            reply.send(new HttpMessage("thread.update"));
        } else {
            throw new BackendError("Bad request");
        }
    });

    fastify.delete("/:id", { 
        preHandler: [fastify.authenticate, fastify.isAdmin],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const session = await Thread.startSession();
        try {
            await session.withTransaction(async () => {
                const thread = await Thread.findByIdAndUpdate(request.params.id, { isDeleted: true }, { session: session });
                // remove thread from box
                await Box.updateOne({ _id: thread.box }, { $pull: { threads: thread._id } }, { session: session });
            });
            reply.send(new HttpMessage("thread.delete"));
        }
        finally {
            session.endSession();
        }
    });

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
        const thread = await Thread.findOne({ _id: request.params.id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isUpvoted = thread.upvoted.includes(new Types.ObjectId(request.payload.id));
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
        const thread = await Thread.findOne({ _id: request.params.id, isDeleted: false });
        if (!thread) {
            throw new BackendError("Resource not found");
        }
        const isDownvoted = thread.downvoted.includes(new Types.ObjectId(request.payload.id));
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