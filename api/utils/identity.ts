import { JwtPayloadDto } from "api/dtos/request/jwt-payload.dto";
import { BackendError } from "api/errors";
import { UserRole } from "api/models/user";
import { Types } from "mongoose";

class Identity {
    private payload: JwtPayloadDto;
    private moderators: Types.ObjectId[];
    private target: any;
    private isModeratorCache?: boolean;

    constructor(payload: JwtPayloadDto, moderators?: Types.ObjectId[], target?: any) {
        this.payload = payload;
        this.moderators = moderators || [];
        this.target = target || {};
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
}

export class IdentityBuilder {
    private payload: JwtPayloadDto;
    private moderators: Types.ObjectId[];
    private target: any;

    addPayload(payload: JwtPayloadDto) {
        const builder = new IdentityBuilder();
        builder.payload = payload;
        return builder;
    }

    addModerators(moderators: Types.ObjectId[]) {
        this.moderators = moderators;
        return this;
    }

    addTarget(target: any) {
        this.target = target;
        return this;
    }

    build() {
        return new Identity(this.payload, this.moderators, this.target);
    }

    static new() {
        return new IdentityBuilder();
    }
}