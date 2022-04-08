import { urls } from './urls';
import { StaticFileResolver } from './static-file-resolver';

function csrfSafeMethod(method: string) {
    // these HTTP methods do not require CSRF protection
    return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method.toUpperCase());
}

export class HTTPClient {
    private csrfToken: string;

    constructor(private resolver: StaticFileResolver) {
        const cookieJar = new URLSearchParams(document.cookie.replace(/; /g, '&'));
        const csrfToken = cookieJar.get('csrftoken');
        if (csrfToken !== null && csrfToken !== '') {
            this.csrfToken = csrfToken;
        } else {
            throw new Error('No CSRF token in document cookies');
        }
    }

    async wrappedFetch(
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

    wrappedJsonFetch(
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

    async subview(viewName: string): Promise<string> {
        const url = this.resolver.resolve('subviews/' + viewName + '.html');
        if (!url) {
            throw new Error(
                `Couldn't find URL for 'subviews/${viewName}.html' ` +
                    '(if you are running the code locally, this could be because you' +
                    ' added a new page without running collectstatic)',
            );
        }

        const response = await this.wrappedFetch('loading subview', url);
        return response.text();
    }

    async list_libraries(): Promise<unknown> {
        const response = await this.wrappedFetch('listing libraries', urls.libraries(), {
            method: 'get',
        });
        return response.json();
    }

    async update_library(libraryId: string, updates: unknown): Promise<void> {
        await this.wrappedJsonFetch('updating library', urls.library(libraryId), {
            method: 'patch',
            body: JSON.stringify(updates),
        });
    }

    async add_item_to_library(libraryId: string, data: unknown): Promise<void> {
        await this.wrappedJsonFetch(
            'adding item to library',
            urls.libraryItems(libraryId),
            {
                method: 'post',
                body: JSON.stringify(data),
            },
        );
    }

    async update_library_item(
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

    async delete_library(libraryId: string): Promise<void> {
        await this.wrappedFetch('deleting library', urls.library(libraryId), {
            method: 'delete',
        });
    }

    async delete_library_item(libraryId: string, tag: string): Promise<void> {
        await this.wrappedFetch(
            'deleting item from library',
            urls.libraryItem(libraryId, tag),
            { method: 'delete' },
        );
    }

    async list_assessments(organisationId?: string): Promise<unknown> {
        const response = await this.wrappedFetch(
            'listing assessments',
            organisationId !== undefined
                ? urls.organisationAssessments(organisationId)
                : urls.assessments(),
            { method: 'get' },
        );
        return response.json();
    }

    async get_assessment(id: string): Promise<unknown> {
        const response = await this.wrappedFetch(
            'getting assessment',
            urls.assessment(id),
            { method: 'get' },
        );
        return response.json();
    }

    async update_assessment(id: string, updates: unknown): Promise<void> {
        await this.wrappedJsonFetch('updating assessment', urls.assessment(id), {
            method: 'patch',
            body: JSON.stringify(updates),
        });
    }

    async create_assessment(
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

    async duplicate_assessment(id: string): Promise<unknown> {
        const response = await this.wrappedFetch(
            'duplicating assessment',
            urls.duplicateAssessment(id),
            { method: 'post' },
        );
        return response.json();
    }

    async delete_assessment(id: string): Promise<void> {
        await this.wrappedFetch('deleting assessment', urls.assessment(id), {
            method: 'delete',
        });
    }

    async list_organisations(): Promise<unknown> {
        const response = await this.wrappedFetch(
            'listing organisations',
            urls.organisations(),
            { method: 'get' },
        );
        return response.json();
    }

    async list_users(): Promise<unknown> {
        const response = await this.wrappedFetch('listing users', urls.users(), {
            method: 'get',
        });
        return response.json();
    }

    async add_member(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch('adding member', urls.members(organisationId, userId), {
            method: 'post',
        });
    }

    async remove_member(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch('removing member', urls.members(organisationId, userId), {
            method: 'delete',
        });
    }

    async create_library(
        libraryData: unknown,
        organisationId?: string,
    ): Promise<unknown> {
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

    async share_library_with_organisation(
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

    async stop_sharing_library_with_organisation(
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

    async list_organisations_library_shares(
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

    async promote_user_as_librarian(
        organisationId: string,
        userId: string,
    ): Promise<void> {
        await this.wrappedFetch(
            'promoting user as librarian',
            urls.librarians(organisationId, userId),
            { method: 'post' },
        );
    }

    async demote_user_as_librarian(
        organisationId: string,
        userId: string,
    ): Promise<void> {
        await this.wrappedFetch(
            'demoting user as librarian',
            urls.librarians(organisationId, userId),
            { method: 'delete' },
        );
    }

    async upload_image(assessmentId: string, image: string): Promise<unknown> {
        const formData = new FormData();
        formData.append('file', image);
        const response = await this.wrappedFetch(
            'uploading image',
            urls.uploadImage(assessmentId),
            { method: 'post', body: formData },
        );
        return response.json();
    }

    async set_featured_image(assessmentId: string, imageId: string): Promise<void> {
        await this.wrappedJsonFetch(
            'setting featured image',
            urls.setFeaturedImage(assessmentId),
            { method: 'post', body: JSON.stringify({ id: imageId }) },
        );
    }

    async set_image_note(id: string, note: string): Promise<unknown> {
        const response = await this.wrappedJsonFetch(
            'setting image note',
            urls.image(id),
            { method: 'patch', body: JSON.stringify({ note }) },
        );
        return response.json();
    }

    async delete_image(id: string): Promise<void> {
        await this.wrappedFetch('deleting image', urls.image(id), {
            method: 'delete',
        });
    }

    async generate_report(organisationId: string, context: unknown): Promise<Blob> {
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
