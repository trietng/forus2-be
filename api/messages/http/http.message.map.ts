export type HttpMessageKey = 
"auth.login" |
"auth.logout" |
"auth.register" |
"user.update" |
"group.delete" |
"box.update" |
"box.delete" |
"thread.update" |
"thread.delete" |
"comment.update" |
"comment.delete" | 
"auth.forgot_password" |
"auth.reset_password" |
"auth.verify_email";

export const HttpMessageMap: Record<HttpMessageKey, string> = {
    "auth.login": "Login successfully",
    "auth.logout": "Logout successfully",
    "auth.register": "Registration successful",
    "user.update": "User updated successfully",
    "group.delete": "Group deleted successfully",
    "box.update": "Box updated successfully",
    "box.delete": "Box deleted successfully",
    "thread.update": "Thread updated successfully",
    "thread.delete": "Thread deleted successfully",
    "comment.update": "Comment updated successfully",
    "comment.delete": "Comment deleted successfully",
    "auth.forgot_password": "Password reset email sent",
    "auth.reset_password": "Password reset successfully",
    "auth.verify_email": "Email verified successfully"
};