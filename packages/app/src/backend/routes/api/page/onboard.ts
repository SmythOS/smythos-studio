import express from 'express';
import { HUBSPOT_PORTAL_ID } from '../../../constants';
import * as userData from '../../../../backend/services/user-data.service';
import {
  IUserMarketingMetadata,
  UserSettingsKey,
  IUserBuildingType,
  IUserTeamData,
} from '../../../types/user-data';

const router = express.Router();
const submitHubspotForm = ({
  email,
  firstname = '',
  lastname = '',
  name = '',
  company = '',
  jobtype = '',
  jobrole = '',
  message = '',
}: IUserMarketingMetadata & { email: string }) => {
  const formID = 'c104d8b4-aa62-49e9-899d-04d25e39dbdc';
  return fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formID}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fields: [
          {
            name: 'email',
            value: email,
          },
          {
            name: 'firstname',
            value: firstname,
          },
          {
            name: 'lastname',
            value: lastname,
          },
          {
            name: 'company',
            value: company,
          },
          {
            name: 'job_role',
            value: jobrole,
          },
          {
            name: 'job_function_type',
            value: jobtype,
          },
          {
            name: 'message',
            value: message,
          },
        ],
      }),
    },
  );
};

router.post('/store-data', async (req, res) => {
  res.send({ success: false, reason: 'Deprecated' });
});

router.get('/get-data', async (req, res) => {
  const { accessToken } = req.user;
  const data = await userData.getUserSettings<IUserMarketingMetadata>(
    accessToken,
    UserSettingsKey.UserMarketingMetadata,
  );

  const onboardingData = await userData.getUserSettings<IUserMarketingMetadata>(
    accessToken,
    UserSettingsKey.OnboardingTasks,
  );
  res.send({ ...data, onboardingTasks: onboardingData });
});

router.post('/update-onboarding-task-list', async (req, res) => {
  try {
    const { accessToken } = req.user;
    const { key, data } = req.body;

    const onboardingData = await userData.getUserSettings<IUserMarketingMetadata>(
      accessToken,
      UserSettingsKey.OnboardingTasks,
    );

    const settingsRes = await userData.putUserSettings(accessToken, key, {
      ...onboardingData,
      ...data,
    });

    if (!settingsRes?.success) {
      return res.status(400).json({ success: false, error: settingsRes?.error });
    }

    res.send({ success: true, data: settingsRes?.data });
  } catch (error) {
    res.send({ success: false, error });
  }
});

router.post('/store-team-type', async (req, res) => {
  try {
    const { accessToken } = req.user;
    const { jobRoleLabel, jobRoleValue, jobtype, name, email, firstname, lastname } = req.body;

    await userData.putUserSettings<IUserTeamData>(
      accessToken,
      UserSettingsKey.UserMarketingMetadata,
      {
        firstname,
        lastname,
        name,
        jobtype,
        jobRoleLabel,
        jobRoleValue,
      },
    );

    const response = await submitHubspotForm({
      firstname,
      lastname,
      email,
      name,
      jobtype,
      jobrole: jobRoleLabel,
    });

    res.send({ success: response.status === 200 });
  } catch (error) {
    res.send({ success: false, error });
  }
});

export function getBuildingData(accessToken: string) {
  return userData.getUserSettings<IUserBuildingType>(
    accessToken,
    UserSettingsKey.UserBuildingMetadata,
  );
}

router.get('/get-building-data', async (req, res) => {
  const { accessToken } = req.user;
  const data = await getBuildingData(accessToken);
  res.send(data);
});

export async function storeBuildingData(accessToken: string, targetText: string, email: string) {
  await userData.putUserSettings<IUserBuildingType>(
    accessToken,
    UserSettingsKey.UserBuildingMetadata,
    {
      targetText: (targetText || '').slice(0, 255), // limit to 255 characters
    },
  );
  const response = await submitHubspotForm({
    email,
    message: targetText,
  });

  return response;
}

router.post('/store-building-data', async (req, res) => {
  try {
    const { accessToken } = req.user;
    const { email, targetText }: { email: string; targetText: string } = req.body;

    const response = await storeBuildingData(accessToken, targetText, email);
    res.send({ success: response.status === 200 });
  } catch (error) {
    res.send({ success: false, error });
  }
});

router.post('/store-book-an-intro-call', async (req, res) => {
  try {
    const { accessToken } = req.user;
    const { email, isBooked, planName }: { email: string; isBooked: boolean; planName: string } =
      req.body;
    await userData.putUserSettings<IUserMarketingMetadata>(
      accessToken,
      UserSettingsKey.UserBookAnIntroCall,
      {
        introCallBooked: isBooked,
        planName,
      },
    );
    res.send({ success: true });
  } catch (error) {
    res.send({ success: false, error });
  }
});

router.get('/get-book-an-intro-call', async (req, res) => {
  const { accessToken } = req.user;
  const data = await userData.getUserSettings<IUserMarketingMetadata>(
    accessToken,
    UserSettingsKey.UserBookAnIntroCall,
  );
  res.send(data);
});

export const onboardRouter = router;
