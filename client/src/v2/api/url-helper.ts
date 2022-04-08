import { z } from 'zod';

const staticUrlSchema = z.record(z.string());

export class URLHelper {
    private staticUrls: Record<string, string>;

    constructor(staticUrls: string) {
        this.staticUrls = staticUrlSchema.parse(JSON.parse(staticUrls));
    }

    static(resourcePath: string): string {
        // returns the full URL for the given static file e.g. 'img/graphic.png'
        const resolvedUrl = this.staticUrls[resourcePath];
        if (resolvedUrl !== undefined) {
            return resolvedUrl;
        } else {
            throw new Error(`No app static URL for '${resourcePath}'`);
        }
    }

    apiAssessments(): string {
        return `/v2/api/assessments/`;
    }

    apiAssessment(assessmentId: string): string {
        return `/v2/api/assessments/${assessmentId}/`;
    }

    apiDuplicateAssessment(assessmentId: string): string {
        return `/v2/api/assessments/${assessmentId}/duplicate/`;
    }

    apiUploadImage(assessmentId: string): string {
        return `/v2/api/assessments/${assessmentId}/images/`;
    }

    apiSetFeaturedImage(assessmentId: string): string {
        return `/v2/api/assessments/${assessmentId}/images/featured/`;
    }

    apiImage(imageId: string): string {
        return `/v2/api/images/${imageId}/`;
    }

    apiOrganisationAssessments(organisationId: string): string {
        return `/v2/api/organisations/${organisationId}/assessments/`;
    }

    apiOrganisations(): string {
        return `/v2/api/organisations/`;
    }

    apiUsers(): string {
        return `/v2/api/users/`;
    }

    apiMembers(organisationId: string, userId: string): string {
        return `/v2/api/organisations/${organisationId}/members/${userId}/`;
    }

    apiLibraries(): string {
        return `/v2/api/libraries/`;
    }

    apiOrganisationLibraries(organisationId: string): string {
        return `/v2/api/organisations/${organisationId}/libraries/`;
    }

    apiShareUnshareOrganisationLibraries(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): string {
        return `/v2/api/organisations/${fromOrgId}/libraries/${libraryId}/shares/${toOrgId}/`;
    }

    apiLibraryOrganisationLibraryShares(
        organisationId: string,
        libraryId: string,
    ): string {
        return `/v2/api/organisations/${organisationId}/libraries/${libraryId}/shares/`;
    }

    apiLibrary(libraryId: string): string {
        return `/v2/api/libraries/${libraryId}/`;
    }

    apiLibraryItems(libraryId: string): string {
        return `/v2/api/libraries/${libraryId}/items/`;
    }

    apiLibraryItem(libraryId: string, tag: string): string {
        return `/v2/api/libraries/${libraryId}/items/${tag}/`;
    }

    apiLibrarians(organisationId: string, userId: string): string {
        return `/v2/api/organisations/${organisationId}/librarians/${userId}/`;
    }

    apiReport(organisationId: string): string {
        return `/v2/api/organisations/${organisationId}/report/`;
    }

    htmlAssessment(assessmentId: string): string {
        return `/v2/assessments/${assessmentId}/`;
    }

    htmlOrganisationAdmin(organisationId: string): string {
        return `/admin/v2/organisation/${organisationId}/change/`;
    }
}
