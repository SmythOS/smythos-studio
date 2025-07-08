import express, { Request, Response } from 'express';

import * as userData from '../../../services/user-data.service';
import { getModelInfo, getModels } from '../../../services/huggingFace.service';
import { supportedHfTasks } from '../../../config';
import { kebabToCapitalize } from '../../../utils';
import { APIResponse } from '../../../types/';

const router = express.Router();

const HUGGING_FACE_MODELS_SETTINGS_KEY = 'HuggingFaceModels';

router.post('/', async (req: Request, res: Response<APIResponse>) => {
  let { data = null } = req.body;

  const modelName = data?.resourceKey;

  if (modelName) {
    const modelRes = await getModelInfo(modelName);

    if (!modelRes?.success) {
      return res.status(400).json({ success: false, error: modelRes?.error });
    }

    data = modelRes?.data;
  }

  if (!data?.name) {
    return res.status(400).json({ success: false, error: `Model not found!` });
  }

  if (!data?.inference) {
    return res
      .status(400)
      .json({ success: false, error: `Currently, we support models with Hosted Inference API.` });
  }

  if (!data?.modelTask) {
    return res
      .status(400)
      .json({ success: false, error: `Currently, we support models with "task"` });
  }

  if (!supportedHfTasks.includes(data?.modelTask)) {
    return res.status(400).json({
      success: false,
      error: `Currently, Models under "${kebabToCapitalize(
        data?.modelTask,
      )}" task is not supported`,
    });
  }

  const settingsRes = await userData.saveUserSettings(
    req?.user?.accessToken,
    HUGGING_FACE_MODELS_SETTINGS_KEY,
    data,
  );

  if (!settingsRes?.success) {
    return res.status(400).json({ success: false, error: settingsRes?.error });
  }

  res.send({ success: true, data });
});

router.get('/', async (req, res) => {
  const data = await userData.getUserSettings(
    req?.user?.accessToken,
    HUGGING_FACE_MODELS_SETTINGS_KEY,
  );

  res.send({ success: true, data });
});

router.get('/models', async (req, res) => {
  const result = await getModels(req.query);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  const data = result?.data;

  // the header cannot be received in the frontend with fetch() method. Will check later.
  /* res.set({
        link: `<?search=${search || ''}&page=${+page + 1}&smythCursor=${data?.pagination?.smythCursor?.next}&hfCursor=${data?.pagination?.hfCursor
            ?.next}>; rel="next"`,
    }); */

  res.send({
    success: true,
    data: data?.models,
    headers: {
      link: `?search=${req.query?.search || ''}&page=${+req.query?.page + 1}&hf_cursor_prev=${
        data?.cursors?.hf?.prev || ''
      }&hf_cursor_next=${data?.cursors?.hf?.next || ''}&smyth_cursor_next=${
        data?.cursors?.smyth?.next || ''
      }`,
    },
  });
});

router.delete('/:part1/:part2?', async (req, res) => {
  const { part1, part2 } = req.params;

  const id = `${part1}${part2 ? '/' + part2 : ''}`;

  const deleteRes = await userData.deleteUserSettings(
    req?.user?.accessToken,
    HUGGING_FACE_MODELS_SETTINGS_KEY,
    id,
  );

  if (!deleteRes?.success) {
    return res.status(400).json({ success: false, error: deleteRes?.error });
  }

  res.send({
    success: true,
    data: {
      id,
      message: 'Model deleted successfully!',
    },
  });
});

export default router;
