import { CommentDto } from "dtos/request/comment.dto";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { HttpMessage } from "messages";
import { CommentPageSize } from "models/comment";
import { CommentService } from "services/comment.service";
import { ThreadService } from "services/thread.service";
import { IdentityBuilder } from "utils/identity";
import { contentPatchBodyValidator } from "validators/content.patch-body.validator";
import { Validator } from "validators/validator";

export async function threadsRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/:id/:page", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: "object",
                required: ["id", "page"],
                properties: {
                    id: { type: "string" },
                    page: { type: "number", minimum: 1 }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { id: string, page: number } }>, reply) => {
        let thread = await ThreadService.getThread(request.params.id, request.params.page, CommentPageSize, request.payload.id);
        const identity = IdentityBuilder.new().addPayload(request.payload).addModerators(thread.box.moderators).build();
        if (!identity.hasRole("ROLE_ADMIN", true) && !identity.isModerator(true)) {
            thread.comments = thread.comments.filter((comment: any) => comment.visibility);
        }
        reply.send(thread);
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
            const thread = await ThreadService.getThreadByIdWithBox(request.params.id);
            const identity = IdentityBuilder.new().addPayload(request.payload).addTarget(thread).addModerators(thread.box.moderators).build();
            const isAuthor = identity.isMe(thread.author, true);
            const isAdminOrModerator = identity.hasRole("ROLE_ADMIN", true) || identity.isModerator(true);
            // if user is author and does not modify visibility or user is admin or moderator
            // or if user is admin or moderator and does not modify body
            if (
                (isAuthor && (isAdminOrModerator || identity.doesNotModifyField("visibility"))) ||
                (isAdminOrModerator && identity.doesNotModifyField("body"))
            ) {
                await ThreadService.partialUpdateThread(thread, request.body);
            }
            reply.send(new HttpMessage("thread.update"));
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
        const thread = await ThreadService.getThreadByIdWithBox(request.params.id);
        const identity = IdentityBuilder.new().addPayload(request.payload).addModerators(thread.box.moderators).build();
        if (identity.isMe(thread.author, true) || identity.isModerator(true) || identity.hasRole("ROLE_ADMIN")) {
            await ThreadService.deleteThread(thread);
            reply.send(new HttpMessage("thread.delete"));
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
        const result = await ThreadService.upvoteThread(request.params.id, request.payload.id);
        reply.send(result);
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
        const result = await ThreadService.downvoteThread(request.params.id, request.payload.id);
        reply.send(result);
    });

    fastify.post("/:id/comment", {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                required: ['body'],
                properties: {
                    body: { type: 'string' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: CommentDto, Params: { id: string } }>, reply) => {
        const comment = await CommentService.createComment(request.params.id, request.body, request.payload.id);
        reply.status(201).send(comment);
    });
}