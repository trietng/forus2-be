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
}

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true, maxLength: 20, minLength: 8 },
    passwordHash: { type: String, required: true},
    displayName: { type: String, required: true, maxLength: 100, minLength: 1 },
    email: { type: String , required: true, unique: true },
    role: { type: String, required: true, enum: UserRoleSet, default: 'ROLE_USER' },
    enabled: { type: Boolean, required: true, default: true },
    dateOfBirth: { type: Date },
    avatarUrl: { type: String },
    description: { type: String, maxLength: 512, minLength: 0 },
    threads: {
        type: [{ type: Schema.Types.ObjectId, ref: "Thread" }],
        default: [],
    },
    comments: {
        type: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
        default: [],
    }
}, { timestamps: true });

UserSchema.index({ username: "text", fullname: "text" });

export const User = model<IUser>('User', UserSchema);