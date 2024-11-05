import { Schema, Types, model } from 'mongoose';
import { ISoftDelete } from './extensions/soft-delete';

interface IGroup extends ISoftDelete {
    name: string;
    boxes: Types.ObjectId[];
}

export const GroupConstraints: Partial<Record<keyof IGroup, any>> = {
    name: {
        maxLength: 128,
    }
}

const GroupSchema = new Schema<IGroup>({
    name: { type: String, required: true, unique: true, maxLength: GroupConstraints.name.maxLength, set: (str: string) => str === "" ? undefined : str },
    boxes: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Box'}],
        default: [],
    },
    isDeleted: { type: Boolean, default: false },
}, {timestamps: true});
    
export const Group = model<IGroup>('Group', GroupSchema);