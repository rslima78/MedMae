export interface Medication {
  id: string;
  name: string;
  pillsPerDay: number;
  totalPills: number; // Initial count at startDate
  startDate: string; // ISO 8601
  userId: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  userId: string;
}

export interface PriceRecord {
  id: string;
  medicationId: string;
  pharmacyId: string;
  price: number;
  date: string; // ISO 8601
  userId: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
