import { ErrorReplyDto } from "dtos/error/error-reply.dto";
import { backendErrorMap, ErrorCode } from "./backend-error.map";

export class BackendError extends Error {
    httpCode: number;
    reply: ErrorReplyDto;

    constructor(message: ErrorCode) {
        super(message);
        this.httpCode = backendErrorMap[message];
        this.reply = { message: message.slice(0, 1).toUpperCase() + message.slice(1) };
    }
}