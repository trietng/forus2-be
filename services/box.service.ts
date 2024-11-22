import { BoxDto } from "dtos/request/box.dto";
import { withTransactionForResult } from "helpers/mongoose";
import { Box } from "models/box";
import { Group } from "models/group";
import { Types } from "mongoose";

export class BoxService {
    static async createBox(groupId: string, body: BoxDto) {
        const session = await Box.startSession();
        try {
            return await withTransactionForResult(session, async () => {
                const box = new Box(body);
                box.group = new Types.ObjectId(groupId);
                await box.save({ session: session });
                // Add the box to the group
                return await Group.findByIdAndUpdate(groupId, { $push: { boxes: box._id } }, { session: session });
            });
        } finally {
            session.endSession();
        }
    }
}