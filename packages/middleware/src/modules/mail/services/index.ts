import { config } from '../../../../config/config';
import { sesClient } from '../../../lib/mail';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import ejs from 'ejs';
import { getDirname } from '../../../utils/general';
import path from 'path';

const templatesPath = path.join(getDirname(), 'views', 'emails');

class MailService {
  templates = {
    // subscriptionCreated: `${getDirname()}/views/emails/subscription-created.ejs`,
    subscriptionCreated: path.join(templatesPath, 'subscription-created.ejs'),
    subscriptionRenewed: path.join(templatesPath, 'subscription-renewed.ejs'),
    subscriptionCancellationScheduled: path.join(templatesPath, 'subscription-cancellation-scheduled.ejs'),
    teamInvitation: path.join(templatesPath, 'team-invitation-sent.ejs'),
    spaceInvitation: path.join(templatesPath, 'space-invitation-sent.ejs'),
    requestAgentAccess: path.join(templatesPath, 'request-agent-access.ejs'),
    teamInvitationAccepted: path.join(templatesPath, 'team-invitation-accepted.ejs'),
    successfulTeamJoin: path.join(templatesPath, 'successful-team-join.ejs'),
    shareAgentInvitation: path.join(templatesPath, 'share-agent-invitation.ejs'),
    quotaReached: path.join(templatesPath, 'quota-reached.ejs'),
  };

  sendMail = async ({ to, subject, body, bcc }: { to: string | string[]; subject: string; body: string; bcc?: string | string[] }) => {
    return sesClient.send(
      new SendEmailCommand({
        Source: `SmythOS <${config.variables.AWS_SES_SENDING_EMAIL}>`,
        SourceArn: config.variables.AWS_SES_ARN,
        Destination: {
          ToAddresses: typeof to === 'string' ? [to] : to,
          BccAddresses: bcc ? (typeof bcc === 'string' ? [bcc] : bcc) : undefined,
        },
        Message: {
          Subject: {
            Data: subject,
          },

          Body: {
            Html: {
              Data: body,
            },
          },
        },

        ReturnPath: config.variables.AWS_SES_SENDING_EMAIL,
      }),
    );
  };

  sendTemplateMail = async ({
    to,
    subject,
    template,
    templateData,
    bcc,
  }: {
    to: string | string[];
    subject: string;
    template: string;
    templateData: { [key: string]: any };
    bcc?: string | string[];
  }) => {
    const body = await ejs.renderFile(template, { ...templateData, config: config.variables });
    return this.sendMail({ to, subject, body, bcc });
  };
}

export const mailService = new MailService();
