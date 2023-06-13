import fc from 'fast-check';
import { z } from 'zod';
import { projectSchema } from '../../../src/v2/data-schemas/project';
import { arbDateOrRFC3339, arbFloat } from '../../helpers/arbitraries';

export type ProjectInput = z.input<typeof projectSchema>;

export function arbitraryProjectInputsWithoutScenarios(): fc.Arbitrary<
    Omit<ProjectInput, 'data'>
> {
    return fc.record({
        id: fc.string(),
        name: fc.string(),
        description: fc.string(),
        status: fc.constantFrom('Complete', 'In progress', 'For review', 'Test'),
        created_at: arbDateOrRFC3339(),
        updated_at: arbDateOrRFC3339(),
        organisation: fc.option(
            fc.record({
                id: fc.string(),
                name: fc.string(),
            }),
        ),
        permissions: fc.record({
            can_share: fc.boolean(),
            can_reassign: fc.boolean(),
        }),
        access: fc.array(
            fc.record({
                id: fc.string(),
                name: fc.string(),
                email: fc.string(),
                roles: fc.array(fc.constantFrom('owner', 'org_admin', 'editor')),
            }),
        ),
        images: fc.array(
            fc.record({
                id: arbFloat({ noNaN: true }),
                url: fc.string(),
                width: arbFloat({ noNaN: true }),
                height: arbFloat({ noNaN: true }),
                thumbnail_url: fc.string(),
                thumbnail_width: arbFloat({ noNaN: true }),
                thumbnail_height: arbFloat({ noNaN: true }),
                note: fc.string(),
                is_featured: fc.boolean(),
            }),
        ),
    });
}
