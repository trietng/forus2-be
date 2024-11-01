export type ErrorCode =
'invalid username or password' |
'forbidden' |
'unauthorized';

export const backendErrorMap: Record<ErrorCode, number> = {
    'invalid username or password': 401,
    'unauthorized': 401,
    'forbidden': 403
};