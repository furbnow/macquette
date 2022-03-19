class DjangoAPI {
    constructor(urls) {
        this.urls = urls;

        const cookieJar = new URLSearchParams(document.cookie.replaceAll('; ', '&'));
        this.csrfToken = cookieJar.get('csrftoken');
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

        const response = await fetch(url, {
            method: 'get',
            headers: { 'X-CSRFToken': this.csrfToken },
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        return response.text();
    }

    list_assessments() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.urls.api.assessments(),
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

    get(id) {
        var result = {};
        $.ajax({
            url: this.urls.api.assessment(id),
            async: false,
            error: handleServerError('loading assessment'),
            success: function (data) {
                result = data;
            },
        });
        return result;
    }

    set(id, data, callback) {
        var result = {};
        $.ajax({
            type: 'PATCH',
            url: this.urls.api.assessment(id),
            data: JSON.stringify({ data: data }),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: true,
            error: function (err) {
                callback(err, null);
                handleServerError('updating assessment');
            },
            success: function (data) {
                callback(null, data);
            },
        });
    }

    create(name, description, orgid, callback) {
        var result = 0;
        const newAssessment = {
            name: name,
            description: description,
        };

        var endpoint;
        if (orgid > 0) {
            endpoint = this.urls.api.organisationAssessments(orgid);
        } else {
            endpoint = this.urls.api.assessments();
        }

        $.ajax({
            type: 'POST',
            url: endpoint,
            data: JSON.stringify(newAssessment),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: false,
            error: handleServerError('creating assessment'),
            success: function (data) {
                if (callback) {
                    callback(data);
                }
            },
        });
        return result;
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

    set_status(id, status) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: this.urls.api.assessment(id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({ status }),
                success: function () {
                    resolve();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('setting assessment status')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    set_name_and_description(id, name, description) {
        $.ajax({
            type: 'PATCH',
            url: this.urls.api.assessment(id),
            data: JSON.stringify({ name, description }),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: false,
            error: handleServerError('setting assessment name and description'),
            success: function (data) {},
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

    upload_image(assessment_id, file) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', file);

            $.ajax({
                type: 'POST',
                url: this.urls.api.uploadImage(assessment_id),
                data: form,
                processData: false,
                contentType: false,
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('uploading image')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
            });
        });
    }

    set_featured_image(assessment_id, image_id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: this.urls.api.setFeaturedImage(assessment_id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({ id: image_id }),
                success: function (data) {
                    resolve();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('setting featured image')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    set_image_note(id, note) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: this.urls.api.image(id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({ note: note }),
                success: function (data) {
                    resolve(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('setting image note')(
                        jqXHR,
                        textStatus,
                        errorThrown,
                    );
                    reject(errorThrown);
                },
            });
        });
    }

    delete_image(id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'DELETE',
                url: this.urls.api.image(id),
                success: function (data) {
                    resolve();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting image')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
            });
        });
    }

    async generate_report(orgid, context) {
        const response = await fetch(this.urls.api.report(orgid), {
            method: 'post',
            body: JSON.stringify(context),
            headers: {
                'X-CSRFToken': this.csrfToken,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const body = await response.json();
            throw new Error(
                `HTTP error, status: ${response.status}, contents: ${JSON.stringify(
                    body,
                )}`,
            );
        }

        return response.blob();
    }
}
