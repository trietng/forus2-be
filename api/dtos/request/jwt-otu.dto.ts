// OTU: One Time Use
export type JwtOTUTokenType = "VERIFY_EMAIL" | "RESET_PASSWORD";

export interface JwtOTUDto {
    tokenType: JwtOTUTokenType;
    email: string;
}