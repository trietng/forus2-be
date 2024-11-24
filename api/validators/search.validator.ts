import { BoxSearchOrder, ThreadSearchOrder, UserSearchOrder } from "api/models/common/search";
import { CustomValidatorFunction } from "./validator";

export const searchOrderValidator: CustomValidatorFunction = (query: any) => {
    switch (query.type) {
        case "user":
            return UserSearchOrder.has(query.order);
        case "box":
            return BoxSearchOrder.has(query.order);
        case "thread":
            return ThreadSearchOrder.has(query.order);
        default:
            return false;
    }
}