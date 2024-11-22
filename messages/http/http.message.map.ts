export type HttpMessageKey = 
"auth.login" |
"auth.logout" |
"auth.register" |
"user.update" |
"group.delete" |
"box.update" |
"box.delete" |
"thread.update" |
"thread.delete";

export const HttpMessageMap: Record<HttpMessageKey, string> = {
    "auth.login": "Login successfully",
    "auth.logout": "Logout successfully",
    "auth.register": "Registration successful",
    "user.update": "User updated successfully",
    "group.delete": "Group deleted successfully",
    "box.update": "Box updated successfully",
    "box.delete": "Box deleted successfully",
    "thread.update": "Thread updated successfully",
    "thread.delete": "Thread deleted successfully"
};