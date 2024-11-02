import { UserRole } from "models/user";

export interface JwtPayloadDto {
    id: number;
    username: string;
    role: UserRole;
    avatarUrl?: string;
}