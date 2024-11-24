export type BackendErrorKey =
"Invalid username or password" |
"Unauthorized" |
"Forbidden" |
"Bad request" |
"Resource not found";

export const BackendErrorMap: Record<BackendErrorKey, number> = {
    "Invalid username or password": 401,
    "Unauthorized": 401,
    "Forbidden": 403,
    "Bad request": 400,
    "Resource not found": 404
};