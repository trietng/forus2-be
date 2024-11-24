import { BoxConstraints } from "api/models/box";

export function boxPatchBodyValidator(body: any): boolean {
    for (const key in body) {
        switch (key) {
            case 'name':
                if (typeof body.name !== 'string' || body.name.length < BoxConstraints.name.minLength || body.name.length > BoxConstraints.name.maxLength) {
                    return false;
                }
                break;
            case 'description':
                if (typeof body.description !== 'string' || body.description.length > BoxConstraints.description.maxLength) {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}