import { z } from 'zod';
import { zodPredicateUnion } from '../../data-schemas/helpers/zod-predicate-union';
import { isIndexable } from '../../helpers/is-indexable';

function saveableSchema<Value, Err>(
    valueSchema: z.ZodType<Value, z.ZodTypeDef, Value>,
    errSchema: z.ZodType<Err, z.ZodTypeDef, Err>,
) {
    return z.discriminatedUnion('status', [
        z.object({ status: z.literal('not edited'), stored: valueSchema }),
        z.object({
            status: z.enum(['edited', 'saving', 'saved']),
            stored: valueSchema,
            user: valueSchema,
        }),
        z.object({
            status: z.literal('failed to save'),
            stored: valueSchema,
            user: valueSchema,
            error: errSchema,
        }),
    ]);
}

export const imageDataModel = z.object({
    id: z.number(),
    url: z.string(),
    width: z.number(),
    height: z.number(),
    thumbnailURL: z.string(),
    thumbnailWidth: z.number(),
    thumbnailHeight: z.number(),
    isFeatured: z.boolean(),
    isSelected: z.boolean(),
    note: saveableSchema(z.string(), z.unknown()),
});
export type ImageDataModel = z.output<typeof imageDataModel>;

export const imageServerResponse = z.object({
    id: z.number(),
    url: z.string(),
    width: z.number(),
    height: z.number(),
    thumbnail_url: z.string(),
    thumbnail_width: z.number(),
    thumbnail_height: z.number(),
    note: z.string(),
    is_featured: z.boolean(),
});
export type ServerImage = z.output<typeof imageServerResponse>;

function serverToDataModel(image: ServerImage): ImageDataModel {
    return {
        id: image.id,
        url: image.url,
        width: image.width,
        height: image.height,
        thumbnailURL: image.thumbnail_url,
        thumbnailWidth: image.thumbnail_width,
        thumbnailHeight: image.thumbnail_height,
        isFeatured: image.is_featured,
        isSelected: false,
        note: { status: 'not edited', stored: image.note },
    };
}

export const imageSchema = zodPredicateUnion([
    {
        name: 'data model',
        predicate: (val) => isIndexable(val) && 'thumbnailURL' in val,
        schema: imageDataModel,
    },
    {
        name: 'server',
        predicate: (val) => isIndexable(val) && 'thumbnail_url' in val,
        schema: imageServerResponse.transform(serverToDataModel),
    },
]);
export type Image = z.output<typeof imageSchema>;
