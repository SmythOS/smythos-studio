import { getM2MToken } from '../../../tests/utils/get-tokens';

(async () => {
  const token = await getM2MToken();
  console.log(token);
})();
