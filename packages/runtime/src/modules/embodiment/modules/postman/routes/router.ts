import { getOpenAPIJSON } from "@embodiment/helpers/openapi-adapter.helper";
import agentLoader from "@embodiment/middlewares/agentLoader.mw";
import express from "express";
import Converter from "openapi-to-postmanv2";

const router = express.Router();

router.get("/", agentLoader, async (req: any, res) => {
  let domain = req.hostname;

  try {
    const openAPISpec = await getOpenAPIJSON(
      req._rawAgent,
      domain,
      req._agentVersion,
      false
    ).catch((error) => {
      console.error(error);
      return { error: error.message };
    });

    if (openAPISpec?.error) {
      return res.status(500).send({ error: openAPISpec.error });
    }

    const conversionResult: any = await new Promise((resolve, reject) => {
      Converter.convert(
        { type: "json", data: openAPISpec },
        {},
        (err, result) => {
          if (err) {
            reject(err);
          } else if (result.result) {
            resolve(result);
          } else {
            reject(new Error(`Conversion failed: ${result.reason}`));
          }
        }
      );
    });

    // Force download the generated Postman collection
    const filename = `${req._rawAgent.name}.postman.json`; // Specify the filename here
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(conversionResult?.output?.[0]?.data, null, 2));
  } catch (error: any) {
    console.error(error);
    return res.status(500).send({ error: error.message });
  }
});

export { router as postmanRouter };
