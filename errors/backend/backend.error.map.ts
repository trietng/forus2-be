export type BackendErrorKey =
"Invalid username or password" |
"Unauthorized" |
"Forbidden";

export const BackendErrorMap: Record<BackendErrorKey, number> = {
    "Invalid username or password": 401,
    "Unauthorized": 401,
    "Forbidden": 403
};