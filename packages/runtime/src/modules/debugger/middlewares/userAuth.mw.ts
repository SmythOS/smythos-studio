import { mwUserAPI } from '@/core/services/smythAPIReq';
import { Logger } from '@smythos/sre';

const console = Logger('UserAuth.mw.ts');

export default async function UserAuth(req, res, next) {
  const accessToken = req.header('Authorization') ? req.header('Authorization').split(' ')[1] : null;
  const teamId = req.header('x-smyth-team-id');

  if (!accessToken) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  try {
    const result = await mwUserAPI.get(`/teams/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-smyth-team-id': teamId,
      },
    });

    const team = result?.data?.team || {};

    if (!team?.id) {
      return res.status(401).send({ error: 'Team not found' });
    }

    res.locals.user = {
      teamId: team?.id,
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).send({ error: 'Unauthorized' });
  }
}
