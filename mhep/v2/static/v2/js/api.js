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

    list_libraries() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.libraries(),
                datatype: 'json',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('loading libraries')(
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

    update_library_item(library_id, tag, updates) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.libraryItem(library_id, tag),
                type: 'PUT',
                data: JSON.stringify(updates),
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('updating item in library')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
                success: function () {
                    resolve();
                },
            });
        });
    }

    delete_library(library_id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.library(library_id),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting library')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function () {
                    resolve();
                },
            });
        });
    }

    delete_library_item(library_id, tag) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.libraryItem(library_id, tag),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting item from library')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
                success: function () {
                    resolve();
                },
            });
        });
    }

    list_assessments(orgid = null) {
        const url = orgid
            ? this.urls.api.organisationAssessments(orgid)
            : this.urls.api.assessments();
        return new Promise((resolve, reject) => {
            $.ajax({
                url,
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('listing assessments')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    get_assessment(id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.assessment(id),
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('loading assessment')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    update_assessment(id, updates) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: this.urls.api.assessment(id),
                data: JSON.stringify(updates),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('updating assessment')(
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

    create_assessment(name, description, orgid) {
        const newAssessment = {
            name: name,
            description: description,
        };

        let url;
        if (orgid > 0) {
            url = this.urls.api.organisationAssessments(orgid);
        } else {
            url = this.urls.api.assessments();
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: url,
                data: JSON.stringify(newAssessment),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('creating assessment')(
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

    duplicate_assessment(id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.duplicateAssessment(id),
                type: 'POST',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('duplicating assessment')(
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

    delete_assessment(id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.assessment(id),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting assessment')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
                success: function () {
                    resolve();
                },
            });
        });
    }

    list_organisations() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.organisations(),
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('listing organisations')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
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

    add_member(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.members(orgid, userid),
                type: 'POST',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('adding member')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    }

    remove_member(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.members(orgid, userid),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('removing member')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    }

    create_library(libraryData, organisationID) {
        var apiURL = '';
        if (organisationID == null) {
            apiURL = this.urls.api.libraries();
        } else {
            apiURL = this.urls.api.organisationLibraries(organisationID);
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                url: apiURL,
                type: 'POST',
                data: JSON.stringify(libraryData),
                datatype: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('creating library')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    }

    share_library_with_organisation(fromOrgID, libraryID, toOrgID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.shareUnshareOrganisationLibraries(
                    fromOrgID,
                    libraryID,
                    toOrgID,
                ),
                type: 'POST',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('sharing library with organisation')(
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

    stop_sharing_library_with_organisation(fromOrgID, libraryID, toOrgID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.shareUnshareOrganisationLibraries(
                    fromOrgID,
                    libraryID,
                    toOrgID,
                ),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('stopping sharing library with organisation')(
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

    list_organisations_library_shares(orgID, libraryID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.libraryOrganisationLibraryShares(orgID, libraryID),
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('listing organisations library is shared with')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    promote_user_as_librarian(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.librarians(orgid, userid),
                type: 'POST',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('promoting user as librarian')(
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

    demote_user_as_librarian(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.librarians(orgid, userid),
                type: 'DELETE',
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('demoting user as librarian')(
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
