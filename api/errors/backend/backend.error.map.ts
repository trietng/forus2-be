export type BackendErrorKey =
"Invalid username or password" |
"Unauthorized" |
"Forbidden" |
"Bad request" |
"Resource not found" |
"Invalid token" |
"User not verified" |
"Username or email already exists";

export const BackendErrorMap: Record<BackendErrorKey, number> = {
    "Invalid username or password": 401,
    "Unauthorized": 401,
    "Invalid token": 401,
    "User not verified": 403,
    "Username or email already exists": 409,
    "Forbidden": 403,
    "Bad request": 400,
    "Resource not found": 404
};