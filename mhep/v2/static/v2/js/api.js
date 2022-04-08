function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method.toUpperCase());
}

$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            var csrftoken = getCookie('csrftoken');
            // relates to Django's CSRF_HEADER_NAME setting
            xhr.setRequestHeader('X-CSRFTOKEN', csrftoken);
        }
    },
});

function handleServerError(intendedAction) {
    /*
    pass this into $.ajax() as the error parameter for example
    ```
      $ajax({
        success: function(response) { ... },
        error: handleServerError('listing libraries'),
        ...
      })
    ```
    */

    return function (jqXHR, textStatus, errorThrown) {
        let msg = jqXHR.statusText;
        if (jqXHR.responseJSON) {
            msg += ': ' + JSON.stringify(jqXHR.responseJSON);
        }

        console.error('jqXHR:', jqXHR);
        console.error('textStatus:', textStatus);
        console.error('errorThrown:', errorThrown);
        console.error('responseJSON: ', jqXHR.responseJSON);
        console.error(
            'error ' +
                intendedAction +
                ': server returned: HTTP ' +
                jqXHR.status +
                ': ' +
                msg,
        );
        alert(
            'Error ' +
                intendedAction +
                '. The server responded: HTTP ' +
                jqXHR.status +
                ': ' +
                msg,
        );
    };
}

class DjangoAPI {
    constructor(urls) {
        this.urls = urls;

        const cookieJar = new URLSearchParams(document.cookie.replaceAll('; ', '&'));
        this.csrfToken = cookieJar.get('csrftoken');
    }

    async wrappedFetch(intendedAction, url, params = {}) {
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
            alert(`error ${intendedAction}: ${err}`);
            console.error(`Error ${intendedAction}:`, err);
            throw new Error(`Error ${intendedAction}: ${err}`);
        }

        if (!response.ok) {
            const msg = `Error ${intendedAction}: server returned ${response.status} (${response.statusText})`;
            alert(msg);

            if (response.headers.get('content-type') === 'application/json') {
                const json = await response.json();
                console.error('Response body:', json);
                throw new Error(`${msg}: ${JSON.stringify(json)}`);
            } else {
                throw new Error(msg);
            }
        }

        return response;
    }

    wrappedJsonFetch(intendedAction, url, params = {}) {
        params.headers = Object.assign(
            { 'content-type': 'application/json' },
            params.headers,
        );
        return this.wrappedFetch(intendedAction, url, params);
    }

    async subview(viewName) {
        const url = this.urls.static('subviews/' + viewName + '.html');
        if (!url) {
            throw new Error(
                `Couldn't find URL for 'subviews/${view}.html' ` +
                    '(if you are running the code locally, this could be because you' +
                    ' added a new page without running collectstatic)',
            );
        }

        const response = await this.wrappedFetch('loading subview', url);
        return response.text();
    }

    async list_libraries() {
        const response = await this.wrappedFetch(
            'listing libraries',
            this.urls.api.libraries(),
            { method: 'get' },
        );
        return response.json();
    }

    update_library(library_id, updates) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: this.urls.api.library(library_id),
                data: JSON.stringify(updates),
                datatype: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('updating library')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    }

    add_item_to_library(library_id, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: this.urls.api.libraryItems(library_id),
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('adding item to library')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    }

    async update_library_item(libraryId, tag, updates) {
        await this.wrappedJsonFetch(
            'updating item in library',
            this.urls.api.libraryItem(libraryId, tag),
            {
                method: 'put',
                body: JSON.stringify(updates),
            },
        );
    }

    async delete_library(libraryId) {
        await this.wrappedFetch('deleting library', this.urls.api.library(libraryId), {
            method: 'delete',
        });
    }

    async delete_library_item(libraryId, tag) {
        await this.wrappedFetch(
            'deleting item from library',
            this.urls.api.libraryItem(libraryId, tag),
            { method: 'delete' },
        );
    }

    async list_assessments(organisationId) {
        const response = await this.wrappedFetch(
            'listing assessments',
            organisationId
                ? this.urls.api.organisationAssessments(organisationId)
                : this.urls.api.assessments(),
            { method: 'get' },
        );
        return response.json();
    }

    async get_assessment(id) {
        const response = await this.wrappedFetch(
            'getting assessment',
            this.urls.api.assessment(id),
            { method: 'get' },
        );
        return response.json();
    }

    async update_assessment(id, updates) {
        await this.wrappedJsonFetch('updating assessment', this.urls.api.assessment(id), {
            method: 'patch',
            body: JSON.stringify(updates),
        });
    }

    async create_assessment(name, description, orgid) {
        const response = await this.wrappedJsonFetch(
            'duplicating assessment',
            orgid
                ? this.urls.api.organisationAssessments(orgid)
                : this.urls.api.assessments(),
            {
                method: 'post',
                body: JSON.stringify({ name, description }),
            },
        );
        return response.json();
    }

    async duplicate_assessment(id) {
        const response = await this.wrappedFetch(
            'duplicating assessment',
            this.urls.api.duplicateAssessment(id),
            { method: 'post' },
        );
        return response.json();
    }

    async delete_assessment(id) {
        await this.wrappedFetch('deleting assessment', this.urls.api.assessment(id), {
            method: 'delete',
        });
    }

    async list_organisations() {
        const response = await this.wrappedFetch(
            'listing organisations',
            this.urls.api.organisations(),
            { method: 'get' },
        );
        return response.json();
    }

    list_users() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.users(),
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // This means we can't do this because we're not an admin in any
                    // groups.  Just resolve to the empty list.
                    if (jqXHR.status == 403) {
                        return resolve([]);
                    }

                    handleServerError('listing users')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
            });
        });
    }

    async add_member(organisationId, userId) {
        await this.wrappedFetch(
            'adding member',
            this.urls.api.members(organisationId, userId),
            { method: 'post' },
        );
    }

    async remove_member(organisationId, userId) {
        await this.wrappedFetch(
            'removing member',
            this.urls.api.members(organisationId, userId),
            { method: 'delete' },
        );
    }

    async create_library(libraryData, organisationId) {
        const response = await this.wrappedJsonFetch(
            'creating library',
            organisationId
                ? this.urls.api.organisationLibraries(organisationId)
                : this.urls.api.libraries(),
            {
                method: 'post',
                body: JSON.stringify(libraryData),
            },
        );

        return response.json();
    }

    async share_library_with_organisation(fromOrgId, libraryId, toOrgId) {
        await this.wrappedFetch(
            'sharing library with organisation',
            this.urls.api.shareUnshareOrganisationLibraries(
                fromOrgId,
                libraryId,
                toOrgId,
            ),
            { method: 'post' },
        );
    }

    async stop_sharing_library_with_organisation(fromOrgId, libraryId, toOrgId) {
        await this.wrappedFetch(
            'stopping sharing library with organisation',
            this.urls.api.shareUnshareOrganisationLibraries(
                fromOrgId,
                libraryId,
                toOrgId,
            ),
            { method: 'delete' },
        );
    }

    async list_organisations_library_shares(organisationId, libraryId) {
        const response = await this.wrappedFetch(
            'listing organisations library is shared with',
            this.urls.api.libraryOrganisationLibraryShares(organisationId, libraryId),
            { method: 'get' },
        );
        return response.json();
    }

    async promote_user_as_librarian(organisationId, userId) {
        await this.wrappedFetch(
            'promoting user as librarian',
            this.urls.api.librarians(organisationId, userId),
            { method: 'post' },
        );
    }

    async demote_user_as_librarian(organisationId, userId) {
        await this.wrappedFetch(
            'demoting user as librarian',
            this.urls.api.librarians(organisationId, userId),
            { method: 'delete' },
        );
    }

    async upload_image(assessmentId, image) {
        const formData = new FormData();
        formData.append('file', image);
        const response = await this.wrappedFetch(
            'uploading image',
            this.urls.api.uploadImage(assessmentId),
            { method: 'post', body: formData },
        );
        return response.json();
    }

    async set_featured_image(assessmentId, imageId) {
        await this.wrappedJsonFetch(
            'setting featured image',
            this.urls.api.setFeaturedImage(assessmentId),
            { method: 'post', body: JSON.stringify({ id: imageId }) },
        );
    }

    async set_image_note(id, note) {
        const response = await this.wrappedJsonFetch(
            'setting image note',
            this.urls.api.image(id),
            { method: 'patch', body: JSON.stringify({ note }) },
        );
        return response.json();
    }

    async delete_image(id) {
        await this.wrappedFetch('deleting image', this.urls.api.image(id), {
            method: 'delete',
        });
    }

    async generate_report(organisationId, context) {
        const response = await this.wrappedJsonFetch(
            'generating report',
            this.urls.api.report(organisationId),
            {
                method: 'post',
                body: JSON.stringify(context),
            },
        );

        return response.blob();
    }
}
