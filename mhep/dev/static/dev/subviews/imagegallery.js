function imagegallery_UpdateUI() {
    Macquette.render(
        Macquette.views.ImageGallery,
        {assessmentId: p.id, images: p.images},
        document.querySelector('#content'),
        update,
    );
}

function imagegallery_UnloadUI() {
    Macquette.unmount(document.querySelector('#content'));
}
