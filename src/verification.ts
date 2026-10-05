import type { DocumentType, VerificationDocument } from './types';
import { todayInIndia } from './utils';

/** Keep client readiness identical to the database's created_at, id ordering. */
export function compareVerificationDocuments(a: VerificationDocument, b: VerificationDocument) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function latestVerificationDocument(documents: VerificationDocument[], ownerId: string, vehicleId: string | null, type: DocumentType) {
  return documents
    .filter((document) => document.ownerId === ownerId && document.vehicleId === vehicleId && document.type === type)
    .sort((a, b) => compareVerificationDocuments(b, a))[0];
}

export function isLatestVerificationDocument(all: VerificationDocument[], document: VerificationDocument) {
  return !all.some((other) => other.ownerId === document.ownerId
    && other.vehicleId === document.vehicleId
    && other.type === document.type
    && compareVerificationDocuments(other, document) > 0);
}

export function requiredVerificationDocumentsApproved(documents: VerificationDocument[], ownerId: string, vehicleId: string | null, types: DocumentType[], registrationUpdatedAt?: string) {
  const today = todayInIndia();
  return types.every((type) => {
    const latest = latestVerificationDocument(documents, ownerId, vehicleId, type);
    const registrationCurrent = type !== 'registration' || !registrationUpdatedAt
      || Boolean(latest?.createdAt && latest.createdAt >= registrationUpdatedAt);
    return latest?.status === 'approved'
      && registrationCurrent
      && (!latest.expiresOn || latest.expiresOn >= today);
  });
}
