import { GroupDto } from "dtos/request/group.dto";
import { BackendError } from "errors";
import { Box } from "models/box";
import { Group } from "models/group";
import { Types } from "mongoose";

export class GroupService {
    static async getGroups() {
        // get all groups with name and the thread count of each box
        const groups = await Group.aggregate([
            {
                $match: { isDeleted: false }
            },
            {
                $lookup: {
                    from: 'boxes',
                    localField: 'boxes',
                    foreignField: '_id',
                    as: 'boxes'
                }
            },
            {
                $unwind: {
                    path: '$boxes',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    boxes: { 
                        $push: {
                            $cond: {
                                // if the box is not null, then return the box with the thread count
                                if: { $and: [{ $isArray: '$boxes.threads' }, { $isArray: '$boxes.subscribers' }] },
                                then: {
                                    _id: '$boxes._id',
                                    name: '$boxes.name',
                                    description: '$boxes.description',
                                    status: '$boxes.status',
                                    threadCount: { $size: '$boxes.threads'},
                                    subscriberCount: { $size: '$boxes.subscribers' }
                                },
                                else: '$boxes'
                            }
                        }
                    },
                    createdAt: { $first: '$createdAt' }
                }
            },
            {
                $sort: { createdAt: 1 }
            }
        ]);
        return groups;
    }

    static async createGroup(groupDto: GroupDto) {
        const group = new Group(groupDto);
        return await group.save();
    }

    static async updateGroup(id: string, groupDto: GroupDto) {
        const result = await Group.findOneAndUpdate({ _id: id, isDeleted: false }, groupDto, { new: true });
        if (!result) {
            throw new BackendError("Resource not found");
        }
    }

    static async deleteGroup(id: string) {
        const session = await Group.startSession();
        try {
            await session.withTransaction(async () => {
                const group = await Group.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { session: session });
                if (!group) {
                    throw new BackendError("Resource not found");
                }
                // soft delete all boxes in the group
                await Box.updateMany({ _id: { $in: group.boxes } }, { isDeleted: true }, { session: session });
            });
        }
        finally {
            session.endSession();
        }
    }
}