import { Schema, Types, model } from 'mongoose';

interface IGroup {
    name: string;
    boxes: Types.ObjectId[];
}

const GroupSchema = new Schema<IGroup>({
    name: { type: String, required: true, unique: true, maxLength: 128, minLength: 1},
    boxes: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Box'}],
        default: [],
    },
}, {timestamps: true});

export const Group = model<IGroup>('Group', GroupSchema);