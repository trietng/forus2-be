import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { UserConstraints } from "models/user";
import { LoginDto } from "dtos/request/login.dto";
import { RegisterDto } from "dtos/request/register.dto";
import { HttpMessage } from "messages";
import { AuthService } from "services/auth.service";

export async function authRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'displayName', 'email'],
                properties: {
                    username: { type: 'string', minLength: UserConstraints.username.minLength, maxLength: UserConstraints.username.maxLength },
                    password: { type: 'string', minLength: UserConstraints.password.minLength },
                    displayName: { type: 'string', minLength: UserConstraints.displayName.minLength, maxLength: UserConstraints.displayName.maxLength },
                    email: { type: 'string', format: 'email' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: RegisterDto }>, reply) => {
        AuthService.register(request.body);
        reply.send({ message: 'User registered' });
    });
    
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string', minLength: UserConstraints.username.minLength, maxLength: UserConstraints.username.maxLength },
                    password: { type: 'string', minLength: UserConstraints.password.minLength }
                }
            }
        }
    }, async (request: FastifyRequest<{ Body: LoginDto }>, reply) => {
        const payload = await AuthService.login(request.body);
        const accessToken = request.jwt.sign(payload, { expiresIn: process.env.SESSION_DURATION }).split('.');
        const headerPayload = accessToken[0] + '.' + accessToken[1];
        const signature = accessToken[2];
        const cookieExpiry = new Date();
        cookieExpiry.setDate(cookieExpiry.getDate() + parseInt(process.env.SESSION_DURATION.split('d')[0]));
        reply.setCookie('headerPayload', headerPayload, { expires: cookieExpiry, path: '/', httpOnly: false, secure: true, sameSite: 'none', domain: process.env.DOMAIN });
        reply.setCookie('signature', signature, { expires: cookieExpiry, path: '/', httpOnly: true, secure: true, sameSite: 'none', domain: process.env.DOMAIN });
        reply.send(new HttpMessage("auth.login"));
    });

    fastify.delete('/logout', { preHandler: [fastify.authenticate] }, async (_, reply) => {
        reply.clearCookie('headerPayload', { domain: process.env.DOMAIN });
        reply.clearCookie('signature', { domain: process.env.DOMAIN });
        reply.send(new HttpMessage("auth.logout"));
    });
}