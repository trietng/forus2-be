import { ErrorReplyDto } from "api/dtos/error/error-reply.dto";
import { BackendErrorMap, BackendErrorKey } from "./backend.error.map";
import { HttpMessage } from "api/messages";

export class BackendError extends Error {
    httpCode: number;
    reply: ErrorReplyDto;

    constructor(message: BackendErrorKey) {
        super(message);
        this.httpCode = BackendErrorMap[message];
        this.reply = HttpMessage.create(message);
    }
}