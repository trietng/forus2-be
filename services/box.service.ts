import { BoxDto } from "dtos/request/box.dto";
import { BackendError } from "errors";
import { Box } from "models/box";
import { SortUtils } from "models/common/sort-option";
import { Group } from "models/group";
import { ThreadSortOption } from "models/thread";
import { User } from "models/user";
import { Types } from "mongoose";

export class BoxService {
    static async getBoxById(id: string) {
        const result = await Box.findOne({ _id: id, isDeleted: false });
        if (!result) {
            throw new BackendError("Resource not found");
        }
        return result;
    }

    static async getBox(id: string, page: number, limit: number, sortOption: ThreadSortOption, userId: string) {
        if (isNaN(page)) {
            page = 1;
        }
        const aggregatableSortOption = SortUtils.parseAggregatableSortOption(sortOption);
        const userObjectId = new Types.ObjectId(userId);
        const box = await Box.aggregate([
            // Match the box and not deleted
            { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
            // lookup group
            {
                $lookup: {
                    from: "groups",
                    localField: "group",
                    foreignField: "_id",
                    as: "group",
                },
            },
            {
                $unwind: "$group"
            },
            {
                $lookup: {
                    from: "threads",
                    let: { localThreads: "$threads" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$localThreads"]
                                }
                            }
                        }
                    ],
                    as: "threads"
                },
            },
            {
                $unwind: {
                    path: "$threads",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { id: "$threads.author" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                        { $project: { _id: 1, displayName: 1, avatarUrl: 1 } },
                    ],
                    as: "threads.author",
                },
            },
            {
                $unwind: {
                    path: "$threads.author",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    description: { $first: "$description" },
                    group: { $first: "$group" },
                    subscribers: { $first: "$subscribers" },
                    moderators: { $first: "$moderators" },
                    threads: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$threads", {}] },
                                then: {
                                    _id: "$threads._id",
                                    title: "$threads.title",
                                    body: "$threads.body",
                                    author: "$threads.author",
                                    score: {
                                        $subtract: [
                                            { $size: "$threads.upvoted" },
                                            { $size: "$threads.downvoted" },
                                        ],
                                    },
                                    commentCount: { $size: "$threads.comments" },
                                    voteStatus: {
                                        $cond: {
                                            if: { $in: [userObjectId, "$threads.upvoted"] },
                                            then: 1,
                                            else: {
                                                $cond: {
                                                    if: { $in: [userObjectId, "$threads.downvoted"] },
                                                    then: -1,
                                                    else: 0,
                                                },
                                            },
                                        },
                                    },
                                    visibility: "$threads.visibility",
                                    createdAt: "$threads.createdAt",
                                    updatedAt: "$threads.updatedAt",
                                },
                                else: "$$REMOVE"
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    pageCount: {
                        $ceil: {
                            $divide: [{ $size: "$threads" }, limit],
                        },
                    },
                    subscriberCount: { $size: "$subscribers" },
                    threadCount: { $size: "$threads" },
                    subscriberStatus: {
                        $cond: {
                            if: { $in: [userObjectId, "$subscribers"] },
                            then: true,
                            else: false,
                        },
                    }
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    pageCount: 1,
                    group: {
                        _id: 1,
                        name: 1
                    },
                    moderators: 1,
                    threads: {
                        $slice: [
                            {
                                $sortArray: {
                                    input: "$threads",
                                    sortBy: { [aggregatableSortOption.field]: aggregatableSortOption.direction },
                                },
                            },
                            (page - 1) * limit,
                            limit
                        ]
                    },
                    threadCount: 1,
                    subscriberCount: 1,
                    subscriberStatus: 1
                },
            },
        ]);
        if (box.length === 0 || (box[0].pageCount < page && box[0].pageCount !== 0)) {
            throw new BackendError("Resource not found");
        }
        return box[0];
    }

    static async createBox(groupId: string, boxDto: BoxDto) {
        const session = await Box.startSession();
        try {
            const box = new Box(boxDto);
            box.group = new Types.ObjectId(groupId);
            await session.withTransaction(async () => {
                await box.save({ session: session });
                // Add the box to the group
                const result = await Group.findOneAndUpdate({ _id: groupId, isDeleted: false }, { $push: { boxes: box._id } }, { session: session });
                if (!result) {
                    throw new BackendError("Resource not found");
                }
            });
            return box;
        } finally {
            session.endSession();
        }
    }

    static async partialUpdateBox(id: string, body: any) {
        const result = await Box.findOneAndUpdate({ _id: id, isDeleted: false }, body, { new: true });
        if (!result) {
            throw new BackendError("Resource not found");
        }
    }

    static async deleteBox(id: string) {
        const session = await Box.startSession();
        try {
            await session.withTransaction(async () => {
                const box = await Box.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { session: session });
                if (!box) {
                    throw new BackendError("Resource not found");
                }
                // remove box from group
                await Group.updateOne({ _id: box.group }, { $pull: { boxes: box._id } }, { session: session });
            });
        }
        finally {
            session.endSession();
        }
    }

    static async subscribeBox(id: string, userId: string) {
        const box = await Box.findOne({ _id: id, isDeleted: false });
        if (!box) {
            throw new BackendError("Resource not found");
        }
        const isSubscribed = box.subscribers.includes(new Types.ObjectId(userId));
        const session = await Box.startSession();
        try {
            await session.withTransaction(async () => {
                if (isSubscribed) {
                    await Box.updateOne({ _id: id }, { $pull: { subscribers: userId } }, { session: session });
                    await User.updateOne({ _id: userId }, { $pull: { subscribedBoxes: id } }, { session: session });
                } else {
                    await Box.updateOne({ _id: id }, { $push: { subscribers: userId } }, { session: session });
                    await User.updateOne({ _id: userId }, { $push: { subscribedBoxes: id } }, { session: session });
                }
            });
            return { subscriberStatus: !isSubscribed };
        } finally {
            session.endSession();
        }
    }
}