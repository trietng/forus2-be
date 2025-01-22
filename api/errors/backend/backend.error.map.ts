export type BackendErrorKey =
"Invalid username or password" |
"Unauthorized" |
"Forbidden" |
"Bad request" |
"Resource not found" |
"Invalid token" |
"User not verified" |
"User is banned" |
"Username or email already exists" |
"Self-banning is not allowed" |
"Admins cannot be banned";

export const BackendErrorMap: Record<BackendErrorKey, number> = {
    "Invalid username or password": 401,
    "Unauthorized": 401,
    "Invalid token": 401,
    "User not verified": 403,
    "User is banned": 403,
    "Self-banning is not allowed": 403,
    "Admins cannot be banned": 403,
    "Username or email already exists": 409,
    "Forbidden": 403,
    "Bad request": 400,
    "Resource not found": 404
};