export const getFirstLastName = (trimmedName: string, trimmedUsername: string) => {
  const [firstName = '', lastName = '']: string[] =
    // eslint-disable-next-line no-unsafe-optional-chaining
    trimmedName || trimmedUsername ? (trimmedName || trimmedUsername)?.split(' ') : ['', ''];
  return [firstName, lastName];
};
