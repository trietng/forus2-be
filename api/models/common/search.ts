import { SortDirection } from "./sort-option";

export const SearchTypeSet = <const> ["user", "box", "thread"];
export type SearchType = typeof SearchTypeSet[number];

export interface SearchQuery {
    q: string;
    type: SearchType;
    direction: SortDirection;
    order: string;
}

export const SearchResultPageSize = 10;

export const UserSearchOrder = new Set(["username", "displayName"]);
export const ThreadSearchOrder = new Set(["title", "createdAt", "updatedAt", "score", "commentCount"]);
export const BoxSearchOrder = new Set(["name"]);