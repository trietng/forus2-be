export const ContentStatusSet = <const> ["pending", "approved", "rejected"];
export type ContentStatus = typeof ContentStatusSet[number];

export interface IContent {
    status: ContentStatus;
}