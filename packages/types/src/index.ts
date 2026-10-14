// Shared types for T_Flatform — Phase 1 (MVP) data model.
// Mirrors the schema defined in CONCEPT.md. Extend here as later phases land.

export type UUID = string;
export type ISODateTime = string;

export type UserRole = "tailor" | "customer" | "supplier" | "admin";
export type MeasurementUnit = "cm" | "inch";

export interface User {
  id: UUID;
  email: string;
  phone: string | null;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface TailorProfile {
  id: UUID;
  userId: UUID;
  businessName: string;
  bio: string | null;
  location: string;
  yearsExperience: number | null;
  avgRating: number;
  ratingCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CustomerProfile {
  id: UUID;
  userId: UUID;
  preferredUnit: MeasurementUnit;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface GarmentType {
  id: UUID;
  name: string;
  description: string | null;
}

export interface MeasurementField {
  id: UUID;
  garmentTypeId: UUID;
  fieldKey: string;
  fieldLabel: string;
  displayOrder: number;
  guideInstructions: string | null;
  guideImageUrl: string | null;
}

export interface MeasurementRecord {
  id: UUID;
  customerId: UUID;
  tailorId: UUID | null;
  garmentTypeId: UUID;
  label: string;
  unit: MeasurementUnit;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface MeasurementValue {
  id: UUID;
  measurementRecordId: UUID;
  measurementFieldId: UUID;
  value: number;
}

export interface Review {
  id: UUID;
  customerId: UUID;
  tailorId: UUID;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  createdAt: ISODateTime;
}
