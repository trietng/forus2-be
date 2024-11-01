import Fastify, { FastifyListenOptions, FastifyReply, FastifyRequest } from 'fastify';
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
const server = Fastify({ logger: true });

// Error handler
server.setErrorHandler((error, _, reply) => {
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
server.register(cors, {
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
server.register(cookie, {
    secret: process.env.AUTH_SECRET,
    hook: 'preHandler'
});

// JWT
server.register(jwt, {
    secret: process.env.AUTH_SECRET
});
server.addHook('preHandler', (request, _, next) => {
    request.jwt = server.jwt;
    next();
});
server.decorate('authenticate', async (request: FastifyRequest, _: FastifyReply) => {
    const authorization = request.headers.authorization;
    const signature = request.cookies['signature'];
    if (!authorization || !authorization.startsWith('Bearer ') || !signature) {
        throw new BackendError('unauthorized');
    }
    const headerPayload = authorization.split(' ')[1];
    const accessToken = `${headerPayload}.${signature}`;
    const payload = request.jwt.verify<FastifyJWT['payload']>(accessToken) as JwtPayloadDto;
    request.payload = payload;
});
server.decorate('isAdmin', async (request: FastifyRequest, _: FastifyReply) => {
    if (request.payload.role !== 'ROLE_ADMIN') {
        throw new BackendError('forbidden');
    }
});

// Register routes
server.register(authRoute, { prefix: "v1/auth" });
// server.register(postRoute, { prefix: 'box' });
// server.register(userDetailRoute, { prefix: 'userdetails', preHandler: [server.authenticate] });

// env variables check
let opts: FastifyListenOptions;
if (!process.env.HOST) {
    opts = { port: parseInt(process.env.PORT) };
}
else {
    opts = { port: parseInt(process.env.PORT), host: process.env.HOST };
}

// Start the server
server.listen(opts, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
    console.log(server.printRoutes());
});