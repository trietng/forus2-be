import { Box } from "api/models/box";
import { SearchQuery, SearchResultPageSize } from "api/models/common/search";
import { SortUtils } from "api/models/common/sort-option";
import { Thread } from "api/models/thread";
import { User } from "api/models/user";
import { Types } from "mongoose";

export class SearchService {
    static async search(query: SearchQuery, page: number, userId: string) {
        let result: any;
        let direction: 1 | -1;
        switch (query.type) {
            case "user":
                direction = SortUtils.parseIntSortDirection(query.direction);
                result = await User.aggregate([
                    {
                        $match: {
                            $text: {
                                $search: query.q
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullname: 1,
                            avatarUrl: 1
                        }
                    },
                    {
                        $sort: {
                            [query.order]: direction
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }, { $addFields: { pageCount: { $ceil: { $divide: ["$total", SearchResultPageSize] } } } }],
                            users: [{ $skip: (page - 1) * SearchResultPageSize }, { $limit: SearchResultPageSize }]
                        }
                    },
                    {
                        $unwind: "$metadata"
                    }
                ]);
                break;
            case "box":
                direction = SortUtils.parseIntSortDirection(query.direction);
                result = await Box.aggregate([
                    {
                        $match: {
                            $text: {
                                $search: query.q
                            },
                            isDeleted: false
                        }
                    },
                    {
                        $addFields: {
                            threadCount: {
                                $size: "$threads"
                            },
                            subscriberCount: { 
                                $size: '$subscribers'
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            threadCount: 1,
                            subscriberCount: 1
                        }
                    },
                    {
                        $sort: {
                            [query.order]: direction
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }, { $addFields: { pageCount: { $ceil: { $divide: ["$total", SearchResultPageSize] } } } }],
                            boxes: [{ $skip: (page - 1) * SearchResultPageSize }, { $limit: SearchResultPageSize }]
                        }
                    },
                    {
                        $unwind: "$metadata"
                    }
                ]);
                break;
            case "thread":
                direction = SortUtils.parseIntSortDirection(query.direction);
                const userObjectId = new Types.ObjectId(userId);
                result = await Thread.aggregate([
                    {
                        $match: {
                            $text: {
                                $search: query.q
                            },
                            isDeleted: false,
                            visibility: true
                        }
                    },
                    {
                        $addFields: {
                            score: {
                                $subtract: [
                                    { $size: "$upvoted" },
                                    { $size: "$downvoted" }
                                ]
                            },
                            commentCount: {
                                $size: "$comments"
                            },
                            voteStatus: {
                                $cond: {
                                    if: {
                                        $in: [userObjectId, "$upvoted"]
                                    },
                                    then: 1,
                                    else: {
                                        $cond: {
                                            if: {
                                                $in: [userObjectId, "$downvoted"]
                                            },
                                            then: -1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            let: { "id": "$author" },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
                                { $project: { _id: 1, username: 1, fullname: 1 } }
                            ],
                            as: "author"
                        }
                    },
                    {
                        $unwind: "$author"
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            body: 1,
                            imageUrl: 1,
                            author: 1,
                            score: 1,
                            commentCount: 1,
                            voteStatus: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        }
                    },
                    {
                        $sort: {
                            [query.order]: direction
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }, { $addFields: { pageCount: { $ceil: { $divide: ["$total", SearchResultPageSize] } } } }],
                            threads: [{ $skip: (page - 1) * SearchResultPageSize }, { $limit: SearchResultPageSize }]
                        }
                    },
                    {
                        $unwind: "$metadata"
                    }
                ]);
                break;
        }
        return result[0];
    }
}