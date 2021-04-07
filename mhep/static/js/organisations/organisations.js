// State
// -----

let orgid = null;
let users = [];
let organisations = [];

// API
// ---

// Thanks to https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
    let name = cname + '=';
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

function csrfFetch(url, options) {
    let realOpts = Object.assign({}, options);
    realOpts.credentials = 'same-origin';
    realOpts.headers = Object.assign(
        {
            'X-CSRFToken': getCookie('csrftoken'),
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        realOpts.headers
    );

    return fetch(url, realOpts);
}

function fetchOrganisations() {
    return csrfFetch(urlRoot)
        .then((response) => response.json())
        .then((json) => (organisations = json));
}

function fetchUsers() {
    return csrfFetch(`${urlRoot}users/`)
        .then((response) => (response.status === 403 ? [] : response.json()))
        .then((json) => (users = json));
}

function fetchAll() {
    return Promise.all([fetchOrganisations(), fetchUsers()]);
}

function addMember(orgid, userid) {
    return csrfFetch(`${urlRoot}${orgid}/members/${userid}/`, {
        method: 'POST',
    }).then((response) => {
        if (response.ok) {
            return true;
        } else {
            throw new Error('Adding member failed');
        }
    });
}

function removeMember(orgid, userid) {
    return csrfFetch(`${urlRoot}${orgid}/members/${userid}/`, {
        method: 'DELETE',
    }).then((response) => {
        if (response.ok) {
            return true;
        } else {
            throw new Error('Removing failed');
        }
    });
}

function promoteUserToLibrarian(orgid, userid) {
    return csrfFetch(`${urlRoot}${orgid}/librarians/${userid}/`, {
        method: 'POST',
    }).then((response) => {
        if (response.ok) {
            return true;
        } else {
            throw new Error('Promoting failed');
        }
    });
}

function demoteUserFromLibrarian(orgid, userid) {
    return csrfFetch(`${urlRoot}${orgid}/librarians/${userid}/`, {
        method: 'DELETE',
    }).then((response) => {
        if (response.ok) {
            return true;
        } else {
            throw new Error('Demoting failed');
        }
    });
}

// Organisation list
// -----------------

function drawOrganisationList() {
    document.querySelector('#org-list-view').classList.remove('d-none');
    document.querySelector('#org-member-view').classList.add('d-none');

    let out = organisations
        .map((org) => `<li><a href="#${org.id}">${org.name}</a></li>`)
        .join('');
    document.querySelector('#org-list').innerHTML = out;
}

// Single organisation view
// ------------------------

function replaceChildrenWith(id, nodes) {
    document.querySelector(id).innerHTML = '';
    document.querySelector(id).appendChild(nodes);
}

function drawOrganisation(organisation) {
    document.querySelector('#org-list-view').classList.add('d-none');
    document.querySelector('#org-member-view').classList.remove('d-none');
    document.querySelector('#org-name').innerHTML = organisation.name;

    drawMemberList(organisation);
    drawAddLibrarianForm(organisation);
    drawAddMemberForm(organisation);

    document.querySelector('#organisation-edit-org').href = adminUrl.replace(
        /12345/,
        organisation.id
    );
}

function drawMemberList(organisation) {
    const tableTemplate = document.querySelector('#member-list-template');
    const rowTemplate = document.querySelector('#member-row-template');

    let table = tableTemplate.content.cloneNode(true);

    for (let member of organisation.members) {
        let row = rowTemplate.content.cloneNode(true);

        row.querySelector('.member-user').textContent = member.name;
        row.querySelector('.member-email').textContent = member.email;
        row.querySelector('.member-last-active').innerHTML = new Date(
            member.last_login
        ).toLocaleString();

        if (!member.is_admin) {
            row.querySelector('.member-is-admin').remove();
        }

        let removeMemberButton = row.querySelector('.remove-user');
        if (
            organisation.permissions.can_add_remove_members &&
            member.email !== currentUser
        ) {
            removeMemberButton.dataset.userId = member.id;
            removeMemberButton.dataset.orgId = organisation.id;
            removeMemberButton.addEventListener('click', handleClickRemoveUser);
        } else {
            removeMemberButton.remove();
        }

        if (member.is_librarian) {
            let demoteLibrarianButton = row.querySelector('.demote-librarian');
            if (organisation.permissions.can_promote_demote_librarians) {
                demoteLibrarianButton.dataset.userId = member.id;
                demoteLibrarianButton.dataset.orgId = organisation.id;
                demoteLibrarianButton.addEventListener(
                    'click',
                    handleClickDemoteLibrarian
                );
            } else {
                demoteLibrarianButton.remove();
            }
        } else {
            row.querySelector('.member-is-librarian').remove();
            row.querySelector('.demote-librarian').remove();
        }

        table.querySelector('tbody').appendChild(row);
    }

    replaceChildrenWith('#member-list-container', table);
}

function drawAddLibrarianForm(organisation) {
    const nonlibrarians = organisation.members.filter((member) => !member.is_librarian);

    if (!organisation.permissions.can_promote_demote_librarians || !nonlibrarians.length) {
        document.querySelector('#promote-librarian-form-container').innerHTML = '';
        return;
    }

    const template = document.querySelector('#promote-librarian-form-template');
    const node = template.content.cloneNode(true);
    const form = node.querySelector('form');
    const select = form.querySelector('select');

    form.addEventListener('submit', handleSubmitPromoteLibrarian);

    const html = nonlibrarians.map(
        (member) =>
            `<option value="${member.id}">${member.name} &lt;${member.email}></option>`
    );
    select.innerHTML = html;

    replaceChildrenWith('#promote-librarian-form-container', form);
}

function drawAddMemberForm(organisation) {
    const memberIds = organisation.members.map((member) => member.id);
    const nonmembers = users.filter((user) => !memberIds.includes(user.id));

    if (!organisation.permissions.can_add_remove_members || !nonmembers.length) {
        document.querySelector('#add-member-form-container').innerHTML = '';
        return;
    }

    const template = document.querySelector('#add-member-form-template');
    const node = template.content.cloneNode(true);
    const form = node.querySelector('form');
    const select = form.querySelector('select');

    form.addEventListener('submit', handleSubmitAddMember);

    const html = nonmembers.map(
        (user) => `<option value="${user.id}">${user.name} &lt;${user.email}></option>`
    );
    select.innerHTML = html;

    replaceChildrenWith('#add-member-form-container', form);
}

function fetchAndDrawOrganisation() {
    fetchAll().then(hashNavigator);
}

function handleClickDemoteLibrarian(e) {
    e.preventDefault();

    let button = e.target;
    let orgid = button.dataset.orgId;
    let userid = button.dataset.userId;

    button.disabled = true;
    button.textContent = 'Demoting...';

    demoteUserFromLibrarian(orgid, userid).then((result) => {
        fetchAndDrawOrganisation(orgid);
    });
}

function handleSubmitPromoteLibrarian(e) {
    e.preventDefault();

    let submitButton = $(this).find(':submit');
    let userid = document.querySelector('#promote-select').value;

    submitButton.attr('disabled', true);
    submitButton.val('Adding...');

    promoteUserToLibrarian(orgid, userid).then((result) => {
        submitButton.attr('disabled', false);
        submitButton.val('Add');
        fetchAndDrawOrganisation(orgid);
    });
}

function handleClickRemoveUser(e) {
    e.preventDefault();

    let button = e.target;
    let orgid = button.dataset.orgId;
    let userid = button.dataset.userId;

    button.disabled = true;
    button.textContent = 'Removing...';

    removeMember(orgid, userid).then((result) => {
        fetchAndDrawOrganisation(orgid);
    });
}

function handleSubmitAddMember(e) {
    e.preventDefault();

    let submitButton = $(this).find(':submit');
    let userid = document.querySelector('#user-select').value;

    submitButton.attr('disabled', true);
    submitButton.val('Adding...');

    addMember(orgid, userid).then((result) => {
        submitButton.attr('disabled', false);
        submitButton.val('Add');
        fetchAndDrawOrganisation(orgid);
    });
}

function hashNavigator() {
    document.querySelector('#loading-view').hidden = true;

    if (location.hash === '#' || location.hash === '') {
        orgid = null;
        drawOrganisationList();
    } else {
        orgid = location.hash.slice(1);

        let organisation = organisations.find((e) => e.id === orgid);
        if (organisation) {
            drawOrganisation(organisation);
        } else {
            alert('Bad hash value');
        }
    }
}

function main() {
    fetchAll().then(() => {
        window.addEventListener('hashchange', hashNavigator, false);
        hashNavigator();
    });
}
