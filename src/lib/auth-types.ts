export type PortalRole = "employee" | "manager" | "admin";

export type PortalUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: PortalRole;
  department: string | null;
  designation: string | null;
  managerId: string | null;
};

export type PortalSession = {
  user: PortalUser;
};
