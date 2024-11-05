import { Schema, Types, model } from 'mongoose';

export const UserRoleSet = <const> ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SYSTEM'];
export type UserRole = typeof UserRoleSet[number];

interface IUser {
    username: string;
    passwordHash: string;
    displayName: string;
    email: string;
    role: UserRole;
    enabled: boolean;
    avatarUrl?: string;
    description?: string;
    dateOfBirth?: Date;
    threads: Types.ObjectId[];
    comments: Types.ObjectId[];
    subscribedBoxes: Types.ObjectId[];
}

export const UserConstraints: Partial<Record<keyof IUser | "password", any>> = {
    username: {
        minLength: 4,
        maxLength: 32
    },
    password: {
        minLength: 4
    },
    displayName: {
        minLength: 1,
        maxLength: 100
    },
    description: {
        maxLength: 512
    }
};

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true, maxLength: UserConstraints.username.maxLength, minLength: UserConstraints.username.minLength },
    passwordHash: { type: String, required: true},
    displayName: { type: String, required: true, maxLength: UserConstraints.displayName.maxLength, minLength: UserConstraints.displayName.minLength },
    email: { type: String , required: true, unique: true },
    role: { type: String, required: true, enum: UserRoleSet, default: 'ROLE_USER' },
    enabled: { type: Boolean, required: true, default: true },
    dateOfBirth: { type: Date },
    avatarUrl: { type: String },
    description: { type: String, maxLength: UserConstraints.description.maxLength, default: '' },
    threads: {
        type: [{ type: Schema.Types.ObjectId, ref: "Thread" }],
        default: [],
    },
    comments: {
        type: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
        default: [],
    },
    subscribedBoxes: {
        type: [{ type: Schema.Types.ObjectId, ref: "Box" }],
        default: [],
    }
}, { timestamps: true });

UserSchema.index({ username: "text", fullname: "text" });

export const User = model<IUser>('User', UserSchema);