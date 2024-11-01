import { UserRole } from "entities/user";

export interface JwtPayloadDto {
    id: number;
    username: string;
    role: UserRole;
}