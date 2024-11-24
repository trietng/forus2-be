import { Readable } from "stream";
import sharp from "sharp";

export class ResizeService {
    static async resizeImage(url: string, height: number): Promise<[Readable, string]> {
        const originalReply = await fetch(url);
        const buffer = await sharp(await originalReply.arrayBuffer()).resize(null, height).toBuffer();
        // return a blob
        const stream = Readable.from(buffer);
        const contentType = originalReply.headers.get('content-type');
        return [stream, contentType];
    }
}