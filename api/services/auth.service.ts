import * as bcrypt from 'bcrypt';
import { JwtPayloadDto } from 'api/dtos/request/jwt-payload.dto';
import { LoginDto } from 'api/dtos/request/login.dto';
import { RegisterDto } from 'api/dtos/request/register.dto';
import { BackendError } from 'api/errors';
import { User } from "api/models/user";
import { JwtOTUDto, JwtOTUTokenType } from 'api/dtos/request/jwt-otu.dto';

export class AuthService {
    static async register(registerDto: RegisterDto) {
        const user = new User({
            username: registerDto.username,
            passwordHash: await bcrypt.hash(registerDto.password, parseInt(process.env.SALT_ROUNDS)),
            displayName: registerDto.displayName,
            email: registerDto.email
        });
        try {
            await user.save();
        }
        catch (error) {
            if (error.code === 11000) {
                throw new BackendError('Username or email already exists');
            }
            throw error;
        }
        return user;
    }

    static async login(loginDto: LoginDto) {
        const user = await User.findOne({ username: loginDto.username });
        if (!user) {
            throw new BackendError('Invalid username or password');
        }
        if (!user.enabled) {
            throw new BackendError('User not verified');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new BackendError('Invalid username or password');
        }
        const payload: JwtPayloadDto = {
            id: user.id,
            username: user.username,
            role: user.role,
            avatarUrl: user.avatarUrl
        };
        return payload;
    }

    static async resetPassword(user: any, newPassword: string) {
        user.passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.SALT_ROUNDS));
        await user.save();
    }

    static generateOneTimeUseToken(email: string, tokenType: JwtOTUTokenType) {
        const otu: JwtOTUDto = {
            email,
            tokenType
        }
        return otu;
    }
}