export const SortDirectionSet = <const> ['asc', 'desc'];
export type SortDirection = typeof SortDirectionSet[number];
type IntSortDirection = 1 | -1;

export interface ISortOption<SortableField> {
    field: SortableField;
    direction: SortDirection;
}

export interface IAggregatableSortOption<SortableField> {
    field: SortableField;
    direction: IntSortDirection;
}

export class SortUtils {
    static parseIntSortDirection(direction: SortDirection) {
        return direction === 'asc' ? 1 : -1;
    }

    static parseAggregatableSortOption<SortableField>(sortOption: ISortOption<SortableField>) {
        return {
            field: sortOption.field,
            direction: SortUtils.parseIntSortDirection(sortOption.direction)
        }
    }
}