import express from 'express';
import { smythAPI, authHeaders, forwardToSmythAPIMiddleware } from '../../../utils';
import { getDefaultRoleAcls, isDefaultRole } from '../../../utils/acls.utils';

const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/user${req.url}` });

router.get(
  '/me/subscription',
  forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/subscriptions/me?includeObject=true` }),
);
router.get('/me', async (req, res) => {
  const tid = req.cookies['_fprom_tid']; // affiliate id
  const refId = req.cookies['_fprom_ref']; // referrer id

  try {
    const response = await smythAPI.get(
      '/user/me',
      await authHeaders(req, {
        'x-affiliate-id': tid,
        'x-referrer-id': refId,
      }),
    );

    const userData = response.data;

    // Apply default ACLs if the user has a default role
    const userAcl = userData.user?.userTeamRole?.sharedTeamRole?.acl;
    if (isDefaultRole(userAcl)) {
      const defaultAcls = getDefaultRoleAcls(userAcl.default_role);
      userData.user.userTeamRole.sharedTeamRole.acl = {
        ...userAcl,
        ...defaultAcls,
      };
    }

    return res.json(userData);
  } catch (error) {
    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Internal Server Error' });
  }
});
router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
