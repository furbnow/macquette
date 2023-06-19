import { z } from 'zod';

const staticUrlSchema = z.record(z.string());

export class StaticFileResolver {
    private staticUrls: Record<string, string>;

    constructor(staticUrls: string) {
        this.staticUrls = staticUrlSchema.parse(JSON.parse(staticUrls));
    }

    resolve(resourcePath: string): string {
        // returns the full URL for the given static file e.g. 'img/graphic.png'
        const resolvedUrl = this.staticUrls[resourcePath];
        if (resolvedUrl !== undefined) {
            return resolvedUrl;
        } else {
            throw new Error(`No app static URL for '${resourcePath}'`);
        }
    }
}
