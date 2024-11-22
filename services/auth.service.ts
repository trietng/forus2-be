import * as bcrypt from 'bcrypt';
import { JwtPayloadDto } from 'dtos/request/jwt-payload.dto';
import { LoginDto } from 'dtos/request/login.dto';
import { RegisterDto } from 'dtos/request/register.dto';
import { BackendError } from 'errors';
import { User } from "models/user";

export class AuthService {
    static async register(registerDto: RegisterDto) {
        const user = new User({
            username: registerDto.username,
            passwordHash: await bcrypt.hash(registerDto.password, parseInt(process.env.SALT_ROUNDS)),
            displayName: registerDto.displayName,
            email: registerDto.email
        });
        await user.save();
    }

    static async login(loginDto: LoginDto) {
        const user = await User.findOne({ username: loginDto.username });
        if (!user) {
            throw new BackendError('Invalid username or password');
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
}