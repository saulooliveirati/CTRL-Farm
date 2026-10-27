export type PublicUser = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName?: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
};
