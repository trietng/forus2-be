import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { UserConstraints } from "api/models/user";
import { LoginDto } from "api/dtos/request/login.dto";
import { RegisterDto } from "api/dtos/request/register.dto";
import { HttpMessage } from "api/messages";
import { AuthService } from "api/services/auth.service";
import { UserService } from "api/services/user.service";
import { BackendError } from "api/errors";
import { EmailService } from "api/services/email.service";
import { JwtOTUDto } from "api/dtos/request/jwt-otu.dto";

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
        const user = await AuthService.register(request.body);
        // generate one time use token
        const payload = AuthService.generateOneTimeUseToken(user.email, 'VERIFY_EMAIL');
        const token = request.jwt.sign(payload, { expiresIn: process.env.VERIFY_EMAIL_OTU_DURATION });
        // send email
        await EmailService.sendVerificationEmail(request.body.email, token);
        user.oneTimeUseToken = token;
        await user.save();
        reply.send(new HttpMessage("auth.register"));
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

    fastify.post('/forgot_password', async (request: FastifyRequest<{ Body: { email: string } }>, reply) => {
        // check if email exists
        const user = await UserService.getUserByEmail(request.body.email);
        const payload = AuthService.generateOneTimeUseToken(user.email, 'RESET_PASSWORD');
        const token = request.jwt.sign(payload, { expiresIn: process.env.RESET_PASSWORD_OTU_DURATION });
        // send email
        await EmailService.sendPasswordResetEmail(user.email, token);
        user.oneTimeUseToken = token;
        await user.save();
        reply.send(new HttpMessage("auth.forgot_password"));
    });

    fastify.post('/reset_password', async (request: FastifyRequest<{ Body: ResetPasswordDto }>, reply) => {
        // check if token is valid
        let payload: JwtOTUDto;
        try {
            payload = request.jwt.decode<JwtOTUDto>(request.body.token);
        } catch {
            throw new BackendError('Invalid token');
        }
        if (payload.tokenType !== 'RESET_PASSWORD') {
            throw new BackendError('Invalid token');
        }
        const user = await UserService.getUserByEmail(payload.email);
        if (user.oneTimeUseToken !== request.body.token) {
            throw new BackendError('Invalid token');
        }
        // reset password
        await AuthService.resetPassword(user, request.body.newPassword);
        reply.send(new HttpMessage("auth.reset_password"));
    });

    fastify.post('/verify_email', async (request: FastifyRequest<{ Body: { token: string } }>, reply) => {
        // check if token is valid
        let payload: JwtOTUDto;
        try {
            payload = request.jwt.decode<JwtOTUDto>(request.body.token);
        } catch {
            throw new BackendError('Invalid token');
        }
        if (payload.tokenType !== 'VERIFY_EMAIL') {
            throw new BackendError('Invalid token');
        }
        const user = await UserService.getUserByEmail(payload.email);
        if (user.oneTimeUseToken !== request.body.token) {
            throw new BackendError('Invalid token');
        }
        // verify email
        user.enabled = true;
        user.oneTimeUseToken = null;
        await user.save();
        reply.send(new HttpMessage("auth.verify_email"));
    });
}