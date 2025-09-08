import { Logger } from '@smythos/sre';

import { mwUserAPI } from '@core/services/smythAPIReq';

const console = Logger('(Debugger) Middleware: Team Access Check');

export async function teamAccessCheck(req, res, next) {
  const teamId = req.params.teamId;
  const accessToken = req.header('Authorization') ? req.header('Authorization').split(' ')[1] : null;

  if (!accessToken) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  if (!teamId) {
    console.error('Team ID is required');
    return res.status(400).send({ error: 'Team ID is required' });
  }

  try {
    const result = await mwUserAPI.get(`/teams/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-smyth-team-id': teamId,
      },
    });

    const team = result?.data?.team || {};

    if (teamId !== team?.id) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).send({ error: 'Unauthorized' });
  }
}
