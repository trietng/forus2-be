import { ClientSession } from "mongoose";

interface CallbackFunction<T> {
    (): Promise<T>;
}

export async function withTransactionForResult<T>(session: ClientSession, callback: CallbackFunction<T>): Promise<T> {
    let result: T;
    await session.withTransaction(async () => {
        result = await callback();
        return result;
    });
    return result;
}