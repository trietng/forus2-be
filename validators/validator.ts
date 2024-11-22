import { BackendError } from "errors";

export type CustomValidatorFunction = (body: any) => boolean;

export class Validator {
    private body: any;

    constructor(body: any) {
        this.body = body;
    }
   
    using(fn: CustomValidatorFunction): boolean {
        if (!fn(this.body)) {
            throw new BackendError("Bad request");
        }
        return true;
    }

    static validate(body: any) {
        return new Validator(body);
    }
}
