import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { FastifyJWT, JWT } from '@fastify/jwt';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { FastifyCorsOptions } from '@fastify/cors';
import { configDotenv } from 'dotenv';
import { authRoute } from 'routes/auth.route';
// import { postRoute } from 'routes/post.route';
import { BackendError } from './errors';
import { JwtPayloadDto } from 'dtos/request/jwt-payload.dto';
import { connect } from 'mongoose';
import { usersRoute } from 'routes/users.route';
import { resizeRoute } from 'routes/resize.route';
import { groupsRoute } from 'routes/groups.route';
import { boxesRoute } from 'routes/boxes.route';
import { threadsRoute } from 'routes/threads.route';
import { commentsRoute } from 'routes/comments.route';
import { searchRoute } from 'routes/search.route';
import { pingRoute } from 'routes/ping.route';

declare module 'fastify' {
    interface FastifyRequest {
        jwt: JWT,
        payload: JwtPayloadDto
    }
    export interface FastifyInstance {
        authenticate: any,
        isAdmin: any,
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JwtPayloadDto
    }
}

// Load environment variables from .env file
configDotenv();

// Create a Fastify instance
const app = Fastify({ logger: true });

// Error handler
app.setErrorHandler((error, _, reply) => {
    if (error instanceof BackendError) {
        reply.status(error.httpCode).send(error.reply);
    }
    else {
        reply.status(500).send({ message: error.message });
    }
});

// MongoDB
connect(process.env.MONGODB_URI);

// CORS
app.register(cors, {
    delegator: (_: FastifyRequest, callback: (error: Error | null, corsOptions?: FastifyCorsOptions) => void) => {
        const corsOptions: FastifyCorsOptions = {
        origin: process.env.FRONTEND_URL,
        credentials: true
        };
        // if (/^localhost$/m.test(request.headers.origin)) {
        //   corsOptions.origin = false;
        // }
        callback(null, corsOptions);
    }
});

// Cookie
app.register(cookie, {
    secret: process.env.AUTH_SECRET,
    hook: 'preHandler'
});

// JWT
app.register(jwt, {
    secret: process.env.AUTH_SECRET
});
app.addHook('preHandler', (request, _, next) => {
    request.jwt = app.jwt;
    next();
});
app.decorate('authenticate', async (request: FastifyRequest, _: FastifyReply) => {
    const authorization = request.headers.authorization;
    const signature = request.cookies['signature'];
    if (!authorization || !authorization.startsWith('Bearer ') || !signature) {
        throw new BackendError('Unauthorized');
    }
    const headerPayload = authorization.split(' ')[1];
    const accessToken = `${headerPayload}.${signature}`;
    const payload = request.jwt.verify<FastifyJWT['payload']>(accessToken) as JwtPayloadDto;
    request.payload = payload;
});
app.decorate('isAdmin', async (request: FastifyRequest, _: FastifyReply) => {
    if (request.payload.role !== 'ROLE_ADMIN') {
        throw new BackendError('Forbidden');
    }
});

// Register routes
app.register(pingRoute, { prefix: "ping" });
app.register(authRoute, { prefix: "v1/auth" });
app.register(usersRoute, { prefix: "v1/users" });
app.register(resizeRoute, { prefix: "v1/resize" });
app.register(groupsRoute, { prefix: "v1/groups" });
app.register(boxesRoute, { prefix: "v1/boxes" });
app.register(threadsRoute, { prefix: "v1/threads" });
app.register(commentsRoute, { prefix: "v1/comments" });
app.register(searchRoute, { prefix: "v1/search" });

export default app;