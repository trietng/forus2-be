import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "api/messages";
import { CommentService } from "api/services/comment.service";
import { IdentityBuilder } from "api/utils/identity";
import { contentPatchBodyValidator } from "api/validators/content.patch-body.validator";
import { Validator } from "api/validators/validator";

export async function commentsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/:id/locate", {
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
        const comment = await CommentService.findRelativeLocationInThread(request.params.id);
        reply.send(comment);
    });

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
        if (Validator.validate(request.body).using(contentPatchBodyValidator)) {
            const comment = await CommentService.getCommentByIdWithBox(request.params.id);
            const identity = IdentityBuilder.new().addPayload(request.payload).addTarget(comment).addModerators(comment.thread.box.moderators).build();
            const isAuthor = identity.isMe(comment.author, true);
            const isAdminOrModerator = identity.hasRole("ROLE_ADMIN", true) || identity.isModerator(true);
            // if user is author and does not modify visibility or user is admin or moderator
            // or if user is admin or moderator and does not modify body
            if (
                (isAuthor && (isAdminOrModerator || identity.doesNotModifyField("visibility"))) ||
                (isAdminOrModerator && identity.doesNotModifyField("body"))
            ) {
                await CommentService.partialUpdateComment(comment, request.body);
            }
            reply.send(new HttpMessage("comment.update"));
        }
    });

    fastify.delete("/:id", {
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
        const comment = await CommentService.getCommentByIdWithBox(request.params.id);
        const identity = IdentityBuilder.new().addPayload(request.payload).addTarget(comment).addModerators(comment.thread.box.moderators).build();
        if (identity.isMe(comment.author, true) || identity.hasRole("ROLE_ADMIN", true) || identity.isModerator()) {
            await CommentService.deleteComment(comment);
        }
        reply.send(new HttpMessage("comment.delete"));
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
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const comment = await CommentService.upvoteComment(request.params.id, request.payload.id);
        reply.send(comment);
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
        const comment = await CommentService.downvoteComment(request.params.id, request.payload.id);
        reply.send(comment);
    });
}