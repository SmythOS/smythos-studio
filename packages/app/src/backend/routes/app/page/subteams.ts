// import express from 'express';
// import axios from 'axios';
// import config from '../../../../backend/config';
// const router = express.Router();

// const subTeamAPIReq = axios.create({
//   baseURL: `${config.env.UI_SERVER}`,
// });
// const _smythAPIReq = axios.create({
//   baseURL: `${config.env.SMYTH_API_BASE_URL}/v1`,
// });

// function formatError(res: any, error: any) {
//   console.log('error', error?.response?.data);
//   if (error?.response?.data?.error == 'Unauthorized') {
//     return res.status(401).json({ error: error?.response?.data?.error });
//   } else if (error?.response?.data?.error) {
//     return res
//       .status(error?.response?.data?.error?.code)
//       .json({ error: error?.response?.data?.error });
//   } else {
//     return res.status(500).json({ error: error?.message });
//   }
// }

// router.delete('/deletesubteam', async (req, res) => {
//   try {
//     console.log(req.url, req.body, req.user.accessToken);
//     const response = await subTeamAPIReq.delete(`/api/page/teams/subteams/${req.body.id}`, {
//       headers: req.headers,
//       data: req.body,
//     });
//     console.log('response', response);
//     return res.json(response.data);
//   } catch (error: any) {
//     // Type guard to check if error is an instance of Error
//     return formatError(res, error);
//   }
// });
// router.post('/createsubteam', async (req, res) => {
//   try {
//     console.log(req.url, req.body, req.headers?.Authorization, req.user.accessToken);

//     const response = await subTeamAPIReq.post(`/api/page/teams/subteams`, {
//       // headers: req.headers,

//       headers: { ...req.headers, Authorization: `Bearer ${req.user.accessToken}` },
//       data: req.body,
//     });
//     // const response = await _smythAPIReq.post(`/teams/subteams`, {
//     //   headers: { ...req.headers, Authorization: `Bearer ${req.user.accessToken}` },
//     //   data: req.body,
//     // });
//     console.log('response', response);
//     return res.json(response.data);
//   } catch (error: any) {
//     // Type guard to check if error is an instance of Error
//     return formatError(res, error);
//   }
// });

// router.delete('/unassignmember', async (req, res) => {
//   try {
//     const response = await subTeamAPIReq.delete(
//       `/api/page/teams/${req.body.teamId}/members/unassign/${req.body.memberId}`,
//       {
//         headers: req.headers,
//         data: req.body,
//       },
//     );
//     return res.json(response.data);
//   } catch (error: unknown) {
//     // Type guard to check if error is an instance of Error
//     return formatError(res, error);
//   }
// });

// export default router;

import express from 'express';
import { forwardToSmythAPIMiddleware } from '../../../utils';

const router = express.Router();
const smythProxy = forwardToSmythAPIMiddleware({ endpointBuilder: (req) => `/teams${req.url}` });

router.get('/*', smythProxy);
router.post('/*', smythProxy);
router.put('/*', smythProxy);
router.delete('/*', smythProxy);

export default router;
