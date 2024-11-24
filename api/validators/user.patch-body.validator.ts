import { CustomValidatorFunction } from "./validator";
import { UserConstraints } from "api/models/user";

export const userPatchBodyValidator: CustomValidatorFunction = (body: any) => {
    for (const key in body) {
        switch (key) {
            case 'displayName':
                if (typeof body.displayName !== 'string' || body.displayName.length < UserConstraints.displayName.minLength || body.displayName.length > UserConstraints.displayName.maxLength) {
                    return false;
                }
                break;
            case 'description':
                if (typeof body.description !== 'string' || body.description.length > UserConstraints.description.maxLength) {
                    return false;
                }
                break;
            case 'dateOfBirth':
                if (typeof body.dateOfBirth !== 'string') {
                    return false;
                }
                try {
                    new Date(body.dateOfBirth);
                }
                catch {
                    return false;
                }
                break;
            case 'avatarUrl':
                if (typeof body.avatarUrl !== 'string') {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}