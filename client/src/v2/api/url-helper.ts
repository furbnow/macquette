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
        return '/v2/api/assessments/';
    }

    apiAssessment(assessmentId: string): string {
        const dummyURL = '/v2/api/assessments/12345/';
        return dummyURL.replace(/12345/, assessmentId);
    }

    apiDuplicateAssessment(assessmentId: string): string {
        const dummyURL = '/v2/api/assessments/12345/duplicate/';
        return dummyURL.replace(/12345/, assessmentId);
    }

    apiUploadImage(assessmentId: string): string {
        const dummyURL = '/v2/api/assessments/12345/images/';
        return dummyURL.replace(/12345/, assessmentId);
    }

    apiSetFeaturedImage(assessmentId: string): string {
        const dummyURL = '/v2/api/assessments/12345/images/featured/';
        return dummyURL.replace(/12345/, assessmentId);
    }

    apiImage(imageId: string): string {
        const dummyURL = '/v2/api/images/12345/';
        return dummyURL.replace(/12345/, imageId);
    }

    apiOrganisationAssessments(organisationId: string): string {
        const dummyURL = '/v2/api/organisations/12345/assessments/';
        return dummyURL.replace(/12345/, organisationId);
    }

    apiOrganisations(): string {
        return '/v2/api/organisations/';
    }

    apiUsers(): string {
        return '/v2/api/users/';
    }

    apiMembers(userId: string, organisationId: string): string {
        const dummyURL = '/v2/api/organisations/12345/members/67890/';
        return dummyURL.replace(/12345/, userId).replace(/67890/, organisationId);
    }

    apiLibraries(): string {
        return '/v2/api/libraries/';
    }

    apiOrganisationLibraries(organisationId: string): string {
        return '/v2/api/organisations/12345/libraries/'.replace(/12345/, organisationId);
    }

    apiShareUnshareOrganisationLibraries(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): string {
        const dummyURL = '/v2/api/organisations/123/libraries/456/shares/789/';
        return dummyURL
            .replace(/123/, fromOrgId)
            .replace(/456/, libraryId)
            .replace(/789/, toOrgId);
    }

    apiLibraryOrganisationLibraryShares(
        organisationId: string,
        libraryId: string,
    ): string {
        const dummyURL = '/v2/api/organisations/12345/libraries/67890/shares/';
        return dummyURL.replace(/12345/, organisationId).replace(/67890/, libraryId);
    }

    apiLibrary(libraryId: string): string {
        return '/v2/api/libraries/12345/'.replace(/12345/, libraryId);
    }

    apiLibraryItems(libraryId: string): string {
        const dummyURL = '/v2/api/libraries/12345/items/';
        return dummyURL.replace(/12345/, libraryId);
    }

    apiLibraryItem(libraryId: string, tag: string): string {
        const dummyURL = '/v2/api/libraries/12345/items/abcde/';
        return dummyURL.replace(/12345/, libraryId).replace(/abcde/, tag);
    }

    apiLibrarians(userId: string, organisationId: string): string {
        const dummyURL = '/v2/api/organisations/12345/librarians/67890/';
        return dummyURL.replace(/12345/, userId).replace(/67890/, organisationId);
    }

    apiReport(organisationId: string): string {
        const dummyURL = '/v2/api/organisations/12345/report/';
        return dummyURL.replace(/12345/, organisationId);
    }

    htmlAssessment(assessmentId: string): string {
        return '/v2/assessments/12345/'.replace(/12345/, assessmentId.toString());
    }

    htmlOrganisationAdmin(organisationId: string): string {
        const dummyURL = '/admin/v2/organisation/12345/change/';
        return dummyURL.replace(/12345/, organisationId);
    }
}
