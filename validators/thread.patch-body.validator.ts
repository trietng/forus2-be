import { CustomValidatorFunction } from "./validator";

export const threadPatchBodyValidator: CustomValidatorFunction = (body: any) => {
    for (const key in body) {
        switch (key) {
            case 'body':
                if (typeof body.body !== 'string') {
                    return false;
                }
                break;
            case 'visibility':
                if (typeof body.visibility !== 'boolean') {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}
