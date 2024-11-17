import { UserRole } from "models/user";

export interface JwtPayloadDto {
    id: string;
    username: string;
    role: UserRole;
    avatarUrl?: string;
}