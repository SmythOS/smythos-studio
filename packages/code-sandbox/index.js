import express from "express";
import https from "https";
import "ses";

// Call lockdown once at startup to secure the environment
lockdown();

const app = express();
app.use(express.json({ limit: "10mb" }));

function extractFetchUrls(str) {
  const regex = /\/\/@fetch\((https?:\/\/[^\s]+)\)/g;
  let match;
  const urls = [];

  while ((match = regex.exec(str)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

function fetchCodeFromCDN(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function createSafeCompartment() {
  // Create a secure compartment with hardened globals
  const compartment = new Compartment({
    globals: {
      console: harden({
        log: (...args) => console.log("[Sandbox]", ...args),
        error: (...args) => console.error("[Sandbox]", ...args),
        warn: (...args) => console.warn("[Sandbox]", ...args),
        info: (...args) => console.info("[Sandbox]", ...args),
      }),
      setTimeout: harden((fn, delay) => setTimeout(fn, Math.min(delay, 5000))),
      clearTimeout: harden(clearTimeout),
      Math: harden(Math),
      Date: harden(Date),
      JSON: harden(JSON),
      String: harden(String),
      Number: harden(Number),
      Boolean: harden(Boolean),
      Array: harden(Array),
      Object: harden(Object),
      RegExp: harden(RegExp),
      Error: harden(Error),
      Promise: harden(Promise),
      ___internal: harden({
        b64decode: (str) => Buffer.from(str, "base64").toString("utf8"),
        b64encode: (str) => Buffer.from(str, "utf8").toString("base64"),
      }),
      _output: undefined,
    },
    __options__: true, // temporary migration affordance
  });

  return compartment;
}

app.post("/compile-js", async (req, res) => {
  let { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const compartment = createSafeCompartment();

    // Try to compile the code by evaluating it in the compartment
    compartment.evaluate(code);

    return res.json({ result: "ok" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Compile Error - " + error.message });
  }
});

app.post("/run-js", async (req, res) => {
  try {
    console.log("run-js");
    let { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    if (!code.endsWith(";")) code += ";";

    const compartment = createSafeCompartment();

    // Handle remote URL fetching
    const remoteUrls = extractFetchUrls(code);
    console.log("remoteUrls", remoteUrls);
    for (const url of remoteUrls) {
      console.log("Fetching", url);
      const remoteCode = await fetchCodeFromCDN(url);
      console.log("importing", url);
      compartment.evaluate(remoteCode);
    }

    const randomId = Math.random().toString(36).substring(2, 15);
    const resId = `res${randomId}`;

    // Prepare the script code
    const scriptCode = `
            var ${resId}; 
            ${code};
            ${resId} = JSON.stringify(_output); 
            ${resId};
        `;

    console.log("----------");
    console.log(scriptCode);
    console.log("----------");

    try {
      const rawResult = compartment.evaluate(scriptCode);
      const Output = JSON.parse(rawResult);
      return res.json({ Output });
    } catch (compileError) {
      console.error("Compile/Run Error:", compileError);
      return res
        .status(400)
        .json({ error: "Execution Error - " + compileError.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/run-js/async", async (req, res) => {
  try {
    let { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    if (!code.endsWith(";")) code += ";";

    const compartment = createSafeCompartment();

    // Handle remote URL fetching
    const remoteUrls = extractFetchUrls(code);
    for (const url of remoteUrls) {
      const remoteCode = await fetchCodeFromCDN(url);
      compartment.evaluate(remoteCode);
    }

    const randomId = Math.random().toString(36).substring(2, 15);
    const resId = `res${randomId}`;

    const scriptCode = `
            (async () => {
                let ${resId};
                ${code}
                if(typeof _output === 'object') {
                    ${resId} = JSON.stringify(_output);
                } else {
                    ${resId} = _output;
                }
                return ${resId};
            })()
        `;

    // Evaluate the async code in the compartment
    const asyncFunction = compartment.evaluate(scriptCode);

    // Note: This is a simplified async handling - full Promise support would require more work
    const rawResult = await Promise.resolve(asyncFunction);
    const Output = JSON.parse(rawResult);

    return res.json({ Output });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5055;
app.listen(PORT, () => {
  console.log(`Code Sandbox Server running on http://localhost:${PORT}`);
  console.log("Using SES (Secure EcmaScript) for secure sandboxing");
});
