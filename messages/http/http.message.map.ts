export type HttpMessageKey = 
"auth.login" |
"auth.logout" |
"group.delete" |
"box.delete";

export const HttpMessageMap: Record<HttpMessageKey, string> = {
    "auth.login": "Login successfully",
    "auth.logout": "Logout successfully",
    "group.delete": "Group deleted successfully",
    "box.delete": "Box deleted successfully"
};