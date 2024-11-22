import { BackendError } from "errors";
import { User } from "models/user";

export class UserService {
    static async getUser(id: string) {
        // Get user from database
        return await User.findById(id, { _id: 0, displayName: 1, email: 1, description: 1, dateOfBirth: 1, createdAt: 1 });
    }

    static async partialUpdateUser(id: string, patchBody: any) {
        const result = await User.findByIdAndUpdate(id, patchBody);
        if (!result) {
            throw new BackendError("Resource not found");
        }
    }
}