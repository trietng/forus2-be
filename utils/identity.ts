import { JwtPayloadDto } from "dtos/request/jwt-payload.dto";
import { BackendError } from "errors";
import { UserRole } from "models/user";
import { Types } from "mongoose";

export class Identity {
    private payload: JwtPayloadDto;
    private moderators: Types.ObjectId[];
    private target: any;
    private isModeratorCache?: boolean;

    constructor(payload: JwtPayloadDto) {
        this.payload = payload;
    }

    hasRole(role: UserRole, ignoreError?: boolean) {
        const result = this.payload.role === role;
        if (!result && ignoreError !== true) {
            throw new BackendError("Forbidden");
        }
        return result;
    }

    isMe(id: string | Types.ObjectId, ignoreError?: boolean) {
        const result = (typeof id === "string" && id === this.payload.id) || (id instanceof Types.ObjectId && id.equals(new Types.ObjectId(this.payload.id)));
        if (!result && ignoreError !== true) {
            throw new BackendError("Forbidden");
        }
        return result;
    }

    isModerator(ignoreError?: boolean) {
        if (this.isModeratorCache === undefined) {
            this.isModeratorCache = this.moderators.includes(new Types.ObjectId(this.payload.id));
        }
        const result = this.isModeratorCache === true;
        if (!result && ignoreError !== true) {
            throw new BackendError("Forbidden");
        }
        return result;
    }

    doesNotModifyField(fields: string, ignoreError?: boolean) {
        const result = this.target[fields] === undefined;
        if (!result && ignoreError !== true) {
            throw new BackendError("Forbidden");
        }
        return result;
    }

    operateOn(target: any): Identity {
        this.target = target;
        return this;
    }

    moderatorOf(moderators: Types.ObjectId[]): Identity {
        this.moderators = moderators;
        return this;
    }

    static of(payload: JwtPayloadDto) {
        return new Identity(payload);
    }
}