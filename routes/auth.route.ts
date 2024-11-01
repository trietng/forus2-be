import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import * as bcrypt from 'bcrypt';
import { BackendError } from "errors";
import { User } from "models/user";
import { JwtPayloadDto } from "dtos/request/jwt-payload.dto";
import { LoginDto } from "dtos/request/login.dto";
import { RegisterDto } from "dtos/request/register.dto";

export async function authRoute(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.post('/register', async (request: FastifyRequest<{ Body: RegisterDto }>, reply) => {
        const dto = request.body;
        const user = new User({
            username: dto.username,
            passwordHash: await bcrypt.hash(dto.password, parseInt(process.env.SALT_ROUNDS)),
            displayName: dto.displayName,
            email: dto.email
        });
        await user.save();
        reply.send({ message: 'User registered' });
    });
    
    fastify.post('/login', async (request: FastifyRequest<{ Body: LoginDto }>, reply) => {
        const dto = request.body;
        const user = await User.findOne({ username: dto.username });
        if (!user) {
            throw new BackendError('invalid username or password');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new BackendError('invalid username or password');
        }
        const payload: JwtPayloadDto = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        const accessToken = request.jwt.sign(payload, { expiresIn: process.env.SESSION_DURATION }).split('.');
        const headerPayload = accessToken[0] + '.' + accessToken[1];
        const signature = accessToken[2];
        const cookieExpiry = new Date();
        cookieExpiry.setDate(cookieExpiry.getDate() + parseInt(process.env.SESSION_DURATION.split('d')[0]));
        reply.setCookie('headerPayload', headerPayload, { expires: cookieExpiry, path: '/', httpOnly: false, secure: true, sameSite: 'none', domain: process.env.DOMAIN });
        reply.setCookie('signature', signature, { expires: cookieExpiry, path: '/', httpOnly: true, secure: true, sameSite: 'none', domain: process.env.DOMAIN });
        reply.send({ message: 'Login successful' });
    });

    fastify.delete('/logout', { preHandler: [fastify.authenticate] }, async (_, reply) => {
        reply.clearCookie('headerPayload', { domain: process.env.DOMAIN });
        reply.clearCookie('signature', { domain: process.env.DOMAIN });
        reply.send({ message: 'Logout successful' });
    });
}