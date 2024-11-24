import { HttpMessageKey, HttpMessageMap } from './http.message.map';

export class HttpMessage {
    message: string;

    constructor(message: HttpMessageKey) {
        this.message = HttpMessageMap[message];
    }

    static create(message: string) {
        return { message };
    }
}