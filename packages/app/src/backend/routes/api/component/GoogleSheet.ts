import { Router } from 'express';
import { google, sheets_v4, Auth } from 'googleapis';
import config from '../../../config';

const router: Router = Router();

const oAuth2Client = new google.auth.OAuth2(
  config.env.GOOGLE_CLIENT_ID,
  config.env.GOOGLE_CLIENT_SECRET,
);

function isValidGoogleSheetUrl(url) {
  const regex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^\/]+)\/edit($|[\?#].*)/;
  return regex.test(url);
}

function extractSpreadsheetId(url: string): string | null {
  if (!isValidGoogleSheetUrl(url)) {
    return null;
  }
  const regex = /\/d\/(.*?)\/edit/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

router.post('/getSheetNames', async (req: any, res: any) => {
  try {
    const { url, refresh_token: refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required to get sheet ids' });
    }

    const spreadsheetId = extractSpreadsheetId(url);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid spreadsheet URL provided.' });
    }

    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    // oAuth2Client.setCredentials({access_token:'ya29.a0AfB_byCk0oKi44n9B2ncyvY-iRHkGOe4qkrw4OVkqdS6FfHGhCrijWLTovRrcwpy-435tby61fhzYyWrZ-LylEAPXRGFsnuQqECxkuU7fZtQOT4FHsWinQ_WMBOzpa13Z-lhoCHU9d9hC-65ZvGwKvP__KML1Ka1WsiafAaCgYKAfcSARASFQHsvYlsqJSP7TVCvejMOSGhzDGGeg0173'})
    const refreshAccessToken = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        oAuth2Client.refreshAccessToken((err, tokens: Auth.Credentials) => {
          if (err) {
            console.log('Error from 121 => , you will be rejected', err);
            reject(err);
          } else {
            oAuth2Client.setCredentials({
              access_token: tokens.access_token,
            });
            resolve();
          }
        });
      });
    };

    await refreshAccessToken();

    const sheets: any = google.sheets({ version: 'v4', auth: oAuth2Client });

    const getSpreadsheetData = (spreadsheetId: string): Promise<sheets_v4.Schema$Spreadsheet> => {
      return new Promise((resolve, reject) => {
        sheets.spreadsheets.get({ spreadsheetId }, (err, response) => {
          if (err) reject(err);
          else resolve(response?.data);
        });
      });
    };

    const response = await getSpreadsheetData(spreadsheetId);
    const sheetNamesAndIds: any[] =
      response.sheets?.map((sheet) => ({
        name: sheet.properties?.title!,
        id: sheet.properties?.sheetId!,
      })) || [];

    res.json(sheetNamesAndIds);
  } catch (error) {
    console.error('Error fetching sheet names:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); // function ends here

export default router;
