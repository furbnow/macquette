export const urls = {
  addressSuggestions(): string {
    return `/address-search/v1/suggestions/`;
  },

  resolveAddress(): string {
    return '/address-search/v1/lookup/';
  },

  assessments(): string {
    return `/v2/api/assessments/`;
  },

  assessment(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/`;
  },

  duplicateAssessment(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/duplicate/`;
  },

  shareAssessment(assessmentId: string, userId: string): string {
    return `/v2/api/assessments/${assessmentId}/shares/${userId}/`;
  },

  uploadImage(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/images/`;
  },

  setFeaturedImage(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/images/featured/`;
  },

  image(imageId: number): string {
    return `/v2/api/images/${imageId}/`;
  },

  organisationAssessments(organisationId: string): string {
    return `/v2/api/organisations/${organisationId}/assessments/`;
  },

  organisations(): string {
    return `/v2/api/organisations/`;
  },

  users(): string {
    return `/v2/api/users/`;
  },

  members(organisationId: string, userId: string): string {
    return `/v2/api/organisations/${organisationId}/members/${userId}/`;
  },

  libraries(): string {
    return `/v2/api/libraries/`;
  },

  organisationLibraries(organisationId: string): string {
    return `/v2/api/organisations/${organisationId}/libraries/`;
  },

  shareUnshareOrganisationLibraries(
    fromOrgId: string,
    libraryId: string,
    toOrgId: string,
  ): string {
    return `/v2/api/organisations/${fromOrgId}/libraries/${libraryId}/shares/${toOrgId}/`;
  },

  libraryOrganisationLibraryShares(organisationId: string, libraryId: string): string {
    return `/v2/api/organisations/${organisationId}/libraries/${libraryId}/shares/`;
  },

  library(libraryId: string): string {
    return `/v2/api/libraries/${libraryId}/`;
  },

  libraryItems(libraryId: string): string {
    return `/v2/api/libraries/${libraryId}/items/`;
  },

  libraryItem(libraryId: string, tag: string): string {
    return `/v2/api/libraries/${libraryId}/items/${tag}/`;
  },

  librarians(organisationId: string, userId: string): string {
    return `/v2/api/organisations/${organisationId}/librarians/${userId}/`;
  },

  reports(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/reports/`;
  },

  report(assessmentId: string, reportId: string): string {
    return `/v2/api/assessments/${assessmentId}/reports/${reportId}`;
  },

  reportPreview(assessmentId: string): string {
    return `/v2/api/assessments/${assessmentId}/reports/preview`;
  },
};
