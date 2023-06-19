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
    AddressSuggestionResponse,
    ResolvedAddress,
    ResolvedAddressResponse,
    addressSuggestionResponse,
    resolvedAddressResponse,
} from '../data-schemas/address';
import {
    AssessmentMetadata,
    LibraryMetadata,
    createAssessmentSchema,
    libraryMetadataSchema,
    listAssessmentSchema,
} from '../data-schemas/api-metadata';
import { Library, librarySchema } from '../data-schemas/libraries';
import { Organisation, listOrganisationResponse } from '../data-schemas/organisations';
import {
    UpdateAssessmentResponse,
    UserAccess,
    updateAssessmentSchema,
    userAccessSchema,
} from '../data-schemas/project';
import { Image, imageSchema } from '../data-schemas/project/image';
import { handleNonErrorError } from '../helpers/handle-non-error-errors';
import { isIndexable } from '../helpers/is-indexable';
import { jsEnvironment } from '../helpers/js-environment';
import { Result } from '../helpers/result';
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

    private async throwingRequest(
        params: AxiosRequestConfig & { intent: string; responseType: 'blob' },
    ): Promise<AxiosResponse<Blob>>;

    private async throwingRequest(
        params: AxiosRequestConfig & { intent: string; responseType: 'json' },
    ): Promise<AxiosResponse<unknown>>;

    private async throwingRequest(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<AxiosResponse<string>>;

    private async throwingRequest(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<AxiosResponse> {
        const responseR = await this.request(params);
        if (responseR.isOk()) {
            return responseR.unwrap();
        } else {
            const httpClientError = responseR.unwrapErr();
            if (jsEnvironment() === 'browser') {
                alert(httpClientError.message);
            }
            throw httpClientError;
        }
    }

    private async request(
        params: AxiosRequestConfig & { intent: string; responseType: 'blob' },
    ): Promise<Result<AxiosResponse<Blob>, HttpClientError>>;

    private async request(
        params: AxiosRequestConfig & { intent: string; responseType: 'json' },
    ): Promise<Result<AxiosResponse<unknown>, HttpClientError>>;

    private async request(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<Result<AxiosResponse<string>, HttpClientError>>;

    private async request(
        params: AxiosRequestConfig & { intent: string },
    ): Promise<Result<AxiosResponse, HttpClientError>> {
        try {
            return Result.ok(await this.axios.request(params));
        } catch (error) {
            const httpClientError = new HttpClientError(
                params.intent,
                handleNonErrorError(error),
            );
            console.error(httpClientError.message);
            return Result.err(httpClientError);
        }
    }

    async rawApiCall(method: Method, url: string, data?: unknown): Promise<string> {
        if (process.env['NODE_ENV'] === 'production') {
            throw new Error('This method is for debugging purposes only.');
        }
        const response = await this.throwingRequest({
            intent: 'performing raw API call',
            url,
            method,
            headers: jsonContentTypeHeader,
            data,
        });
        return response.data;
    }

    async listLibraries(): Promise<(Library & LibraryMetadata)[]> {
        const response = await this.throwingRequest({
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
                        if (
                            e.errors[0] !== undefined &&
                            e.errors[0].code === 'invalid_union_discriminator'
                        ) {
                            console.warn(
                                'Server returned a library of an unknown type:',
                                isIndexable(unvalidatedLibrary)
                                    ? unvalidatedLibrary['type']
                                    : 'library not indexable',
                            );
                        } else {
                            console.warn(
                                'Server returned a library which did not pass the validator',
                                unvalidatedLibrary,
                                e,
                            );
                        }
                        return [];
                    } else {
                        throw e;
                    }
                }
            },
        );
    }

    async updateLibrary(libraryId: string, updates: unknown): Promise<void> {
        await this.throwingRequest({
            intent: 'updating library',
            url: urls.library(libraryId),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: updates,
        });
    }

    async addItemToLibrary(libraryId: string, data: unknown): Promise<void> {
        await this.throwingRequest({
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
        await this.throwingRequest({
            intent: 'updating item in library',
            url: urls.libraryItem(libraryId, tag),
            method: 'PUT',
            headers: jsonContentTypeHeader,
            data: updates,
        });
    }

    async deleteLibrary(libraryId: string): Promise<void> {
        await this.throwingRequest({
            intent: 'deleting library',
            url: urls.library(libraryId),
            method: 'DELETE',
        });
    }

    async deleteLibraryItem(libraryId: string, tag: string): Promise<void> {
        await this.throwingRequest({
            intent: 'deleting item from library',
            url: urls.libraryItem(libraryId, tag),
            method: 'DELETE',
        });
    }

    async listAssessments(organisationId?: string): Promise<AssessmentMetadata[]> {
        const response = await this.throwingRequest({
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
        const response = await this.throwingRequest({
            intent: 'getting assessment',
            url: urls.assessment(id),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async updateAssessment(
        id: string,
        updates: unknown,
    ): Promise<null | UpdateAssessmentResponse> {
        const response = await this.throwingRequest({
            intent: 'updating assessment',
            url: urls.assessment(id),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: updates,
            responseType: 'json',
        });
        if (response.status === 200) {
            return updateAssessmentSchema.parse(response.data);
        } else {
            return null;
        }
    }

    async createAssessment(
        name: string,
        description: string,
        organisationId?: string,
    ): Promise<AssessmentMetadata> {
        const response = await this.throwingRequest({
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
        const response = await this.throwingRequest({
            intent: 'duplicating assessment',
            url: urls.duplicateAssessment(id),
            method: 'POST',
            responseType: 'json',
        });
        return createAssessmentSchema.parse(camelise(response.data));
    }

    async shareAssessment(assessmentId: string, userId: string): Promise<UserAccess> {
        const response = await this.throwingRequest({
            intent: 'sharing project',
            url: urls.shareAssessment(assessmentId, userId),
            method: 'PUT',
            responseType: 'json',
        });
        return userAccessSchema.parse(camelise(response.data));
    }

    async unshareAssessment(assessmentId: string, userId: string): Promise<UserAccess> {
        const response = await this.throwingRequest({
            intent: 'unsharing project',
            url: urls.shareAssessment(assessmentId, userId),
            method: 'DELETE',
            responseType: 'json',
        });
        return userAccessSchema.parse(camelise(response.data));
    }

    async deleteAssessment(id: string): Promise<void> {
        await this.throwingRequest({
            intent: 'deleting assessment',
            url: urls.assessment(id),
            method: 'DELETE',
        });
    }

    async listOrganisations(): Promise<Result<Organisation[], HttpClientError>> {
        return (
            await this.request({
                intent: 'listing organisations',
                url: urls.organisations(),
                method: 'GET',
                responseType: 'json',
            })
        ).chain((response) => {
            const parsed = listOrganisationResponse.safeParse(camelise(response.data));
            if (parsed.success === false) {
                return Result.err(
                    new HttpClientError('listing organisations', parsed.error),
                );
            }
            return Result.ok(parsed.data);
        });
    }

    async listUsers(): Promise<unknown> {
        const response = await this.throwingRequest({
            intent: 'listing users',
            url: urls.users(),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async addMember(organisationId: string, userId: string): Promise<void> {
        await this.throwingRequest({
            intent: 'adding member',
            url: urls.members(organisationId, userId),
            method: 'POST',
        });
    }

    async removeMember(organisationId: string, userId: string): Promise<void> {
        await this.throwingRequest({
            intent: 'removing member',
            url: urls.members(organisationId, userId),
            method: 'DELETE',
        });
    }

    async createLibrary(libraryData: unknown, organisationId?: string): Promise<unknown> {
        const response = await this.throwingRequest({
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
        await this.throwingRequest({
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
        await this.throwingRequest({
            intent: 'stopping sharing library with organisation',
            url: urls.shareUnshareOrganisationLibraries(fromOrgId, libraryId, toOrgId),
            method: 'DELETE',
        });
    }

    async listOrganisationsLibraryShares(
        organisationId: string,
        libraryId: string,
    ): Promise<unknown> {
        const response = await this.throwingRequest({
            intent: 'listing organisations library is shared with',
            url: urls.libraryOrganisationLibraryShares(organisationId, libraryId),
            method: 'GET',
            responseType: 'json',
        });
        return response.data;
    }

    async promoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.throwingRequest({
            intent: 'promoting user as librarian',
            url: urls.librarians(organisationId, userId),
            method: 'POST',
        });
    }

    async demoteUserAsLibrarian(organisationId: string, userId: string): Promise<void> {
        await this.throwingRequest({
            intent: 'demoting user as librarian',
            url: urls.librarians(organisationId, userId),
            method: 'DELETE',
        });
    }

    async uploadImage(assessmentId: string, image: File): Promise<Image> {
        const formData = new FormData();
        formData.append('file', image);
        const response = await this.throwingRequest({
            intent: 'uploading image',
            url: urls.uploadImage(assessmentId),
            method: 'POST',
            data: formData,
            responseType: 'json',
        });
        return imageSchema.parse(response.data);
    }

    async setFeaturedImage(assessmentId: string, imageId: number): Promise<void> {
        await this.throwingRequest({
            intent: 'setting featured image',
            url: urls.setFeaturedImage(assessmentId),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: { id: imageId },
        });
    }

    async setImageNote(id: number, note: string): Promise<Image> {
        const response = await this.throwingRequest({
            intent: 'setting image note',
            url: urls.image(id),
            method: 'PATCH',
            headers: jsonContentTypeHeader,
            data: { note },
            responseType: 'json',
        });
        return imageSchema.parse(response.data);
    }

    async deleteImage(id: number): Promise<void> {
        await this.throwingRequest({
            intent: 'deleting image',
            url: urls.image(id),
            method: 'DELETE',
        });
    }

    async generateReport(organisationId: string, reportData: unknown): Promise<Blob> {
        const response = await this.throwingRequest({
            intent: 'generating report',
            url: urls.report(organisationId),
            method: 'POST',
            headers: jsonContentTypeHeader,
            data: reportData,
            responseType: 'blob',
        });
        return response.data;
    }

    async suggestAddresses(
        query: string,
    ): Promise<
        Result<
            AddressSuggestionResponse['results'],
            AddressSuggestionResponse['error'] | HttpClientError
        >
    > {
        const intent = 'getting address suggestions';
        return (
            await this.request({
                intent,
                url: urls.addressSuggestions(),
                method: 'GET',
                params: { q: query },
                responseType: 'json',
            })
        ).chain(
            (
                response,
            ): Result<
                AddressSuggestionResponse['results'],
                AddressSuggestionResponse['error'] | HttpClientError
            > => {
                const parsed = addressSuggestionResponse.safeParse(
                    camelise(response.data),
                );
                if (parsed.success === false) {
                    return Result.err(new HttpClientError(intent, parsed.error));
                }

                if (typeof parsed.data.error === 'string') {
                    return Result.err(parsed.data.error);
                } else {
                    return Result.ok(parsed.data.results);
                }
            },
        );
    }

    async resolveAddress(
        id: string,
    ): Promise<
        Result<ResolvedAddress, ResolvedAddressResponse['error'] | HttpClientError>
    > {
        return (
            await this.request({
                intent: 'resolving address',
                url: urls.resolveAddress(),
                method: 'POST',
                responseType: 'json',
                data: { id },
            })
        ).chain(
            (
                response,
            ): Result<
                ResolvedAddress,
                ResolvedAddressResponse['error'] | HttpClientError
            > => {
                const parsed = resolvedAddressResponse.safeParse(camelise(response.data));
                if (parsed.success === false) {
                    return Result.err(
                        new HttpClientError('resolving address', parsed.error),
                    );
                }

                if (parsed.data.error !== null) {
                    return Result.err(parsed.data.error);
                } else {
                    return Result.ok(parsed.data.result);
                }
            },
        );
    }
}
