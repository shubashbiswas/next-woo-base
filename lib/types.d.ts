export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
};

type NavProps = {
  className?: string;
  children?: React.ReactNode;
  id?: string;
};
