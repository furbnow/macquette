import { urls } from './urls';
import { listAssessmentSchema } from './schemas';
import type { AssessmentMetadata } from './schemas';

function csrfSafeMethod(method: string) {
    // these HTTP methods do not require CSRF protection
    return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method.toUpperCase());
}

export function cameliseStr(str: string): string {
    const replaced = str
        .replace(/(_[a-zA-Z])/g, (capture) => {
            const letter = capture[1];
            if (letter !== undefined) {
                return letter.toUpperCase();
            } else {
                throw new Error('unreachable');
            }
        })
        // Clean up any stragglers
        .replace(/_/g, () => '');

    return replaced;
}

export function camelise(input: unknown): unknown {
    if (Array.isArray(input)) {
        return input.map((row) => camelise(row));
    } else if (typeof input !== 'object' || input === null) {
        return input;
    } else {
        return Object.fromEntries(
            Object.entries(input).map(([key, value]) => {
                return [cameliseStr(key), camelise(value)];
            }),
        );
    }
}

export class HTTPClient {
    private csrfToken: string;

    constructor() {
        const cookieJar = new URLSearchParams(document.cookie.replace(/; /g, '&'));
        const csrfToken = cookieJar.get('csrftoken');
        if (csrfToken !== null && csrfToken !== '') {
            this.csrfToken = csrfToken;
        } else {
            throw new Error('No CSRF token in document cookies');
        }
    }

    private async wrappedFetch(
        intendedAction: string,
        url: string,
        params: RequestInit = {},
    ): Promise<Response> {
        if (!csrfSafeMethod(params.method ?? 'get')) {
            params.headers = Object.assign(
                { 'X-CSRFToken': this.csrfToken },
                params.headers,
            );
        }

        let response;
        try {
            response = await fetch(url, params);
        } catch (err) {
            if (err instanceof TypeError) {
                alert(`error ${intendedAction}: ${err.toString()}`);
                console.error(`Error ${intendedAction}:`, err);
                throw new Error(`Error ${intendedAction}: ${err.toString()}`);
            } else {
                throw err;
            }
        }

        if (!response.ok) {
            const msg = `Error ${intendedAction}: server returned ${response.status} (${response.statusText})`;
            alert(msg);

            if (response.headers.get('content-type') === 'application/json') {
                const json: unknown = await response.json();
                console.error('Response body:', json);
                throw new Error(`${msg}: ${JSON.stringify(json)}`);
            } else {
                throw new Error(msg);
            }
        }

        return response;
    }

    private wrappedJsonFetch(
        intendedAction: string,
        url: string,
        params: RequestInit = {},
    ): Promise<Response> {
        params.headers = Object.assign(
            { 'content-type': 'application/json' },
            params.headers,
        );
        return this.wrappedFetch(intendedAction, url, params);
    }

    async listLibraries(): Promise<unknown> {
        const response = await this.wrappedFetch('listing libraries', urls.libraries(), {
            method: 'get',
        });
        return response.json();
    }

    async updateLibrary(libraryId: string, updates: unknown): Promise<void> {
        await this.wrappedJsonFetch('updating library', urls.library(libraryId), {
            method: 'patch',
            body: JSON.stringify(updates),
        });
    }

    async addItemToLibrary(libraryId: string, data: unknown): Promise<void> {
        await this.wrappedJsonFetch(
            'adding item to library',
            urls.libraryItems(libraryId),
            {
                method: 'post',
                body: JSON.stringify(data),
            },
        );
    }

    async updateLibraryItem(
        libraryId: string,
        tag: string,
        updates: unknown,
    ): Promise<void> {
        await this.wrappedJsonFetch(
            'updating item in library',
            urls.libraryItem(libraryId, tag),
            {
                method: 'put',
                body: JSON.stringify(updates),
            },
        );
    }

    async deleteLibrary(libraryId: string): Promise<void> {
        await this.wrappedFetch('deleting library', urls.library(libraryId), {
            method: 'delete',
        });
    }

    async deleteLibraryItem(libraryId: string, tag: string): Promise<void> {
        await this.wrappedFetch(
            'deleting item from library',
            urls.libraryItem(libraryId, tag),
            { method: 'delete' },
        );
    }

    async listAssessments(organisationId?: string): Promise<AssessmentMetadata> {
        const response = await this.wrappedFetch(
            'listing assessments',
            organisationId !== undefined
                ? urls.organisationAssessments(organisationId)
                : urls.assessments(),
            { method: 'get' },
        );
        const json: unknown = await response.json();
        return listAssessmentSchema.parse(camelise(json));
    }

    async getAssessment(id: string): Promise<unknown> {
        const response = await this.wrappedFetch(
            'getting assessment',
            urls.assessment(id),
            { method: 'get' },
        );
        return response.json();
    }

    async updateAssessment(id: string, updates: unknown): Promise<void> {
        await this.wrappedJsonFetch('updating assessment', urls.assessment(id), {
            method: 'patch',
            body: JSON.stringify(updates),
        });
    }

    async createAssessment(
        name: string,
        description: string,
        organisationId?: string,
    ): Promise<unknown> {
        const response = await this.wrappedJsonFetch(
            'duplicating assessment',
            organisationId !== undefined
                ? urls.organisationAssessments(organisationId)
                : urls.assessments(),
            {
                method: 'post',
                body: JSON.stringify({ name, description }),
            },
        );
        return response.json();
    }

    async duplicateAssessment(id: string): Promise<unknown> {
        const response = await this.wrappedFetch(
            'duplicating assessment',
            urls.duplicateAssessment(id),
            { method: 'post' },
        );
        return response.json();
    }

    async deleteAssessment(id: string): Promise<void> {
        await this.wrappedFetch('deleting assessment', urls.assessment(id), {
            method: 'delete',
        });
    }

    async listOrganisations(): Promise<unknown> {
        const response = await this.wrappedFetch(
            'listing organisations',
            urls.organisations(),
            { method: 'get' },
        );
        return response.json();
    }

    async listUsers(): Promise<unknown> {
        const response = await this.wrappedFetch('listing users', urls.users(), {
            method: 'get',
        });
        return response.json();
    }

    async addMember(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch('adding member', urls.members(organisationId, userId), {
            method: 'post',
        });
    }

    async removeMember(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch('removing member', urls.members(organisationId, userId), {
            method: 'delete',
        });
    }

    async createLibrary(libraryData: unknown, organisationId?: string): Promise<unknown> {
        const response = await this.wrappedJsonFetch(
            'creating library',
            organisationId !== undefined
                ? urls.organisationLibraries(organisationId)
                : urls.libraries(),
            {
                method: 'post',
                body: JSON.stringify(libraryData),
            },
        );

        return response.json();
    }

    async shareLibraryWithOrganisation(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): Promise<void> {
        await this.wrappedFetch(
            'sharing library with organisation',
            urls.shareUnshareOrganisationLibraries(fromOrgId, libraryId, toOrgId),
            { method: 'post' },
        );
    }

    async stopSharingLibraryWithOrganisation(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): Promise<void> {
        await this.wrappedFetch(
            'stopping sharing library with organisation',
            urls.shareUnshareOrganisationLibraries(fromOrgId, libraryId, toOrgId),
            { method: 'delete' },
        );
    }

    async listOrganisationsLibraryShares(
        organisationId: string,
        libraryId: string,
    ): Promise<unknown> {
        const response = await this.wrappedFetch(
            'listing organisations library is shared with',
            urls.libraryOrganisationLibraryShares(organisationId, libraryId),
            { method: 'get' },
        );
        return response.json();
    }

    async promoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch(
            'promoting user as librarian',
            urls.librarians(organisationId, userId),
            { method: 'post' },
        );
    }

    async demoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch(
            'demoting user as librarian',
            urls.librarians(organisationId, userId),
            { method: 'delete' },
        );
    }

    async uploadImage(assessmentId: string, image: string): Promise<unknown> {
        const formData = new FormData();
        formData.append('file', image);
        const response = await this.wrappedFetch(
            'uploading image',
            urls.uploadImage(assessmentId),
            { method: 'post', body: formData },
        );
        return response.json();
    }

    async setFeaturedImage(assessmentId: string, imageId: string): Promise<void> {
        await this.wrappedJsonFetch(
            'setting featured image',
            urls.setFeaturedImage(assessmentId),
            { method: 'post', body: JSON.stringify({ id: imageId }) },
        );
    }

    async setImageNote(id: string, note: string): Promise<unknown> {
        const response = await this.wrappedJsonFetch(
            'setting image note',
            urls.image(id),
            { method: 'patch', body: JSON.stringify({ note }) },
        );
        return response.json();
    }

    async deleteImage(id: string): Promise<void> {
        await this.wrappedFetch('deleting image', urls.image(id), {
            method: 'delete',
        });
    }

    async generateReport(organisationId: string, context: unknown): Promise<Blob> {
        const response = await this.wrappedJsonFetch(
            'generating report',
            urls.report(organisationId),
            {
                method: 'post',
                body: JSON.stringify(context),
            },
        );

        return response.blob();
    }
}
