import { User } from "@src/react/shared/types/entities";

export const deleteAccount = () =>
  fetch(`/api/page/account`, {
    method: 'DELETE',
  });

export const getUserInfo = async () => {
  const res = await fetch('/api/page/user/me');
  const json = await res.json();
  return json?.user as User;
};
