import { ConnectorService, Logger } from "@smythos/sre";
import { mwUserAPI } from "@core/services/smythAPIReq";

const console = Logger("(Core) Middleware: User Agent Access Check");

export default async function UserAgentAccessCheck(req, res, next) {
  const agentDataConnector = ConnectorService.getAgentDataConnector();
  let agentId = req.header("X-AGENT-ID");
  const accessToken = req.header("Authorization")
    ? req.header("Authorization").split(" ")[1]
    : null;

  if (!accessToken) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  if (!agentId) {
    const domain = req.hostname;

    agentId = await agentDataConnector
      .getAgentIdByDomain(domain)
      .catch((error) => {
        console.error(error);
      });
  }

  const agent = await mwUserAPI
    .get(`/ai-agent/${agentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-smyth-team-id": req.header("x-smyth-team-id") ?? undefined,
      },
    })
    .catch((err) => {
      console.error(err);
      return false;
    });

  if (!agent) {
    return res.status(401).send({ error: "Unauthorized" });
  }
  next();
}
