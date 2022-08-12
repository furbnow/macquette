import type {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method,
} from 'axios';
import axios from 'axios';
import { z } from 'zod';

import {
    AssessmentMetadata,
    LibraryMetadata,
    libraryMetadataSchema,
} from '../data-schemas/api-metadata';
import {
    createAssessmentSchema,
    listAssessmentSchema,
} from '../data-schemas/api-metadata';
import { Library, librarySchema } from '../data-schemas/libraries';
import { handleNonErrorError } from '../helpers/handle-non-error-errors';
import { isIndexable } from '../helpers/is-indexable';
import { urls } from './urls';

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

export class HttpClientError<Cause extends Error = Error> extends Error {
    public cause: Cause;
    public intent: string;

    constructor(intent: string, cause: Cause) {
        super(`Error ${intent}: ${formatErrorString(cause)}`);
        this.intent = intent;
        this.cause = cause;
    }

    causeIsAxiosError(): this is HttpClientError<AxiosError<unknown, unknown>> {
        return isIndexable(this.cause) && this.cause['isAxiosError'] === true;
    }
}

function formatErrorString(error: Error): string {
    if (
        axios.isAxiosError(error) &&
        error.response !== null &&
        error.response !== undefined
    ) {
        let detail = '';
        // HTTP error
        if (
            error.response.headers['content-type'] === 'application/json' &&
            typeof error.response.data === 'string'
        ) {
            try {
                const json: unknown = JSON.parse(error.response.data);
                console.error(json);
                if (isIndexable(json) && typeof json['detail'] === 'string') {
                    detail = ` (${json['detail']})`;
                }
            } catch (_) {
                console.error(error.response.data);
            }
        }
        return `server returned ${error.response.status} ${error.response.statusText}${detail}`;
    } else {
        // Something else
        return error.toString();
    }
}

const jsonContentTypeHeader = { 'content-type': 'application/json' };

export class HTTPClient {
    private axios: AxiosInstance;

    constructor(nodeOptions?: {
        sessionId: string;
        csrfToken?: string;
        baseURL: string;
    }) {
        let perEnvironmentAxiosOptionsMixin: AxiosRequestConfig<unknown>;
        switch (jsEnvironment()) {
            case 'node': {
                if (nodeOptions === undefined) {
                    throw new Error('If running in node.js, must pass options');
                }
                const headers: AxiosRequestConfig<unknown>['headers'] = {
                    cookie: `sessionid=${nodeOptions.sessionId}`,
                    referer: nodeOptions.baseURL,
                };
                if (nodeOptions.csrfToken !== undefined) {
                    headers['cookie'] += ';';
                    headers['cookie'] += `csrftoken=${nodeOptions.csrfToken}`;
                    headers['x-csrftoken'] = nodeOptions.csrfToken;
                }
                perEnvironmentAxiosOptionsMixin = {
                    baseURL: nodeOptions.baseURL,
                    headers,
                };
                break;
            }
            case 'browser': {
                if (nodeOptions !== undefined) {
                    throw new Error('Must not specify nodeOptions in a browser context');
                }
                const cookieJar = new URLSearchParams(
                    document.cookie.replace(/; /g, '&'),
                );
                const csrfToken = cookieJar.get('csrftoken');
                if (csrfToken === null || csrfToken === '') {
                    throw new Error('No CSRF token in document cookies');
                }
                perEnvironmentAxiosOptionsMixin = {
                    headers: {
                        'x-csrftoken': csrfToken,
                    },
                };
                break;
            }
        }

        this.axios = axios.create({
            responseType: 'text',
            transitional: {
                silentJSONParsing: false,
                forcedJSONParsing: false,
                clarifyTimeoutError: true,
            },
            ...perEnvironmentAxiosOptionsMixin,
        });
    }

    private async wrappedFetch(
        params: AxiosRequestConfig & { intent: string; responseType: 'blob' },
    ): Promise<AxiosResponse<Blob>>;

    private async wrappedFetch(
        params: AxiosRequestConfig & { intent: string; responseType: 'json' },
    ): Promise<AxiosResponse<unknown>>;

    private async wrappedFetch(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<AxiosResponse<string>>;

    private async wrappedFetch(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<AxiosResponse> {
        try {
            return await this.axios.request(params);
        } catch (error) {
            const httpClientError = new HttpClientError(
                params.intent,
                handleNonErrorError(error),
            );

            switch (jsEnvironment()) {
                case 'node':
                    console.error(httpClientError.message);
                    break;
                case 'browser':
                    alert(httpClientError.message);
                    break;
            }
            throw httpClientError;
        }
    }

    async rawApiCall(method: Method, url: string, data?: unknown): Promise<string> {
        if (process.env['NODE_ENV'] === 'production') {
            throw new Error('This method is for debugging purposes only.');
        }
        const response = await this.wrappedFetch({
            intent: 'performing raw API call',
            url,
            method,
            headers: jsonContentTypeHeader,
            data,
        });
        return response.data;
    }

    async listLibraries(): Promise<(Library & LibraryMetadata)[]> {
        const response = await this.wrappedFetch({
            intent: 'listing libraries',
            url: urls.libraries(),
            method: 'GET',
            headers: jsonContentTypeHeader,
            responseType: 'json',
        });
        const responseItems = z.array(z.unknown()).parse(response.data);
        return responseItems.flatMap(
            (unvalidatedLibrary): [Library & LibraryMetadata] | [] => {
                try {
                    const library = librarySchema.parse(unvalidatedLibrary);
                    const metadata = libraryMetadataSchema.parse(unvalidatedLibrary);
                    return [{ ...metadata, ...library }];
                } catch (e) {
                    if (e instanceof z.ZodError) {
                        console.warn(
                            'Server returned a library which did not pass the validator',
                        );
                        return [];
                    } else {
                        throw e;
                    }
                }
            },
        );
    }

    async updateLibrary(libraryId: string, updates: unknown): Promise<void> {
        await this.wrappedFetch({
            intent: 'updating library',
            url: urls.library(libraryId),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: updates,
        });
    }

    async addItemToLibrary(libraryId: string, data: unknown): Promise<void> {
        await this.wrappedFetch({
            intent: 'adding item to library',
            url: urls.libraryItems(libraryId),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: data,
        });
    }

    async updateLibraryItem(
        libraryId: string,
        tag: string,
        updates: unknown,
    ): Promise<void> {
        await this.wrappedFetch({
            intent: 'updating item in library',
            url: urls.libraryItem(libraryId, tag),
            method: 'PUT',
            headers: jsonContentTypeHeader,
            data: updates,
        });
    }

    async deleteLibrary(libraryId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'deleting library',
            url: urls.library(libraryId),
            method: 'DELETE',
        });
    }

    async deleteLibraryItem(libraryId: string, tag: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'deleting item from library',
            url: urls.libraryItem(libraryId, tag),
            method: 'DELETE',
        });
    }

    async listAssessments(organisationId?: string): Promise<AssessmentMetadata[]> {
        const response = await this.wrappedFetch({
            intent: 'listing assessments',
            url:
                organisationId !== undefined
                    ? urls.organisationAssessments(organisationId)
                    : urls.assessments(),
            method: 'GET',
            responseType: 'json',
        });
        return listAssessmentSchema.parse(camelise(response.data));
    }

    async getAssessment(id: string): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'getting assessment',
            url: urls.assessment(id),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async updateAssessment(id: string, updates: unknown): Promise<void> {
        await this.wrappedFetch({
            intent: 'updating assessment',
            url: urls.assessment(id),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: updates,
        });
    }

    async createAssessment(
        name: string,
        description: string,
        organisationId?: string,
    ): Promise<AssessmentMetadata> {
        const response = await this.wrappedFetch({
            intent: 'duplicating assessment',
            url:
                organisationId !== undefined
                    ? urls.organisationAssessments(organisationId)
                    : urls.assessments(),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: { name, description },
            responseType: 'json',
        });
        return createAssessmentSchema.parse(camelise(response.data));
    }

    async duplicateAssessment(id: string): Promise<AssessmentMetadata> {
        const response = await this.wrappedFetch({
            intent: 'duplicating assessment',
            url: urls.duplicateAssessment(id),
            method: 'POST',
            responseType: 'json',
        });
        return createAssessmentSchema.parse(camelise(response.data));
    }

    async deleteAssessment(id: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'deleting assessment',
            url: urls.assessment(id),
            method: 'DELETE',
        });
    }

    async listOrganisations(): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'listing organisations',
            url: urls.organisations(),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async listUsers(): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'listing users',
            url: urls.users(),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async addMember(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'adding member',
            url: urls.members(organisationId, userId),
            method: 'POST',
        });
    }

    async removeMember(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'removing member',
            url: urls.members(organisationId, userId),
            method: 'DELETE',
        });
    }

    async createLibrary(libraryData: unknown, organisationId?: string): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'creating library',
            url:
                organisationId !== undefined
                    ? urls.organisationLibraries(organisationId)
                    : urls.libraries(),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: libraryData,
            responseType: 'json',
        });

        return response.data;
    }

    async shareLibraryWithOrganisation(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): Promise<void> {
        await this.wrappedFetch({
            intent: 'sharing library with organisation',
            url: urls.shareUnshareOrganisationLibraries(fromOrgId, libraryId, toOrgId),
            method: 'POST',
        });
    }

    async stopSharingLibraryWithOrganisation(
        fromOrgId: string,
        libraryId: string,
        toOrgId: string,
    ): Promise<void> {
        await this.wrappedFetch({
            intent: 'stopping sharing library with organisation',
            url: urls.shareUnshareOrganisationLibraries(fromOrgId, libraryId, toOrgId),
            method: 'DELETE',
        });
    }

    async listOrganisationsLibraryShares(
        organisationId: string,
        libraryId: string,
    ): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'listing organisations library is shared with',
            url: urls.libraryOrganisationLibraryShares(organisationId, libraryId),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async promoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'promoting user as librarian',
            url: urls.librarians(organisationId, userId),
            method: 'POST',
        });
    }

    async demoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'demoting user as librarian',
            url: urls.librarians(organisationId, userId),
            method: 'DELETE',
        });
    }

    async uploadImage(assessmentId: string, image: string): Promise<unknown> {
        const formData = new FormData();
        formData.append('file', image);
        const response = await this.wrappedFetch({
            intent: 'uploading image',
            url: urls.uploadImage(assessmentId),
            method: 'POST',
            data: formData,
            responseType: 'json',
        });
        return response.data;
    }

    async setFeaturedImage(assessmentId: string, imageId: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'setting featured image',
            url: urls.setFeaturedImage(assessmentId),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: { id: imageId },
        });
    }

    async setImageNote(id: string, note: string): Promise<unknown> {
        const response = await this.wrappedFetch({
            intent: 'setting image note',
            url: urls.image(id),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: { note },
            responseType: 'json',
        });
        return response.data;
    }

    async deleteImage(id: string): Promise<void> {
        await this.wrappedFetch({
            intent: 'deleting image',
            url: urls.image(id),
            method: 'DELETE',
        });
    }

    async generateReport(organisationId: string, context: unknown): Promise<Blob> {
        const response = await this.wrappedFetch({
            intent: 'generating report',
            url: urls.report(organisationId),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: context,
            responseType: 'blob',
        });
        return response.data;
    }
}

function jsEnvironment(): 'node' | 'browser' {
    return typeof window === 'undefined' ? 'node' : 'browser';
}
