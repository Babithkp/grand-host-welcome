import type { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
}

export interface SessionDoc {
  _id: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface ApplicationDoc {
  _id: ObjectId;
  userId: ObjectId;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  country: string | null;
  position: string | null;
  submitted: boolean;
  submitted_at: Date | null;
  status: "pending" | "approved" | "rejected" | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationDocumentDoc {
  _id: ObjectId;
  userId: ObjectId;
  file_name: string;
  r2_key: string;
  file_size: number | null;
  created_at: Date;
}
