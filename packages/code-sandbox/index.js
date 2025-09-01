import express from "express";
import https from "https";
import vm from "vm";

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

function createSafeContext() {
  const context = {
    console: {
      log: (...args) => console.log("[Sandbox]", ...args),
      error: (...args) => console.error("[Sandbox]", ...args),
      warn: (...args) => console.warn("[Sandbox]", ...args),
      info: (...args) => console.info("[Sandbox]", ...args),
    },
    setTimeout: (fn, delay) => setTimeout(fn, Math.min(delay, 5000)), // Max 5s timeout
    setInterval: () => {
      throw new Error("setInterval is not allowed");
    },
    clearTimeout: clearTimeout,
    Math: Math,
    Date: Date,
    JSON: JSON,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    Error: Error,
    ___internal: {
      b64decode: (str) => Buffer.from(str, "base64").toString("utf8"),
      b64encode: (str) => Buffer.from(str, "utf8").toString("base64"),
    },
    _output: undefined,
    global: undefined,
    globalThis: undefined,
    process: undefined,
    require: undefined,
    module: undefined,
    exports: undefined,
    __filename: undefined,
    __dirname: undefined,
  };

  // Make the context reference itself as global
  context.global = context;
  context.globalThis = context;

  return vm.createContext(context);
}

app.post("/compile-js", async (req, res) => {
  let { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const context = createSafeContext();

    // Try to compile the script
    const script = new vm.Script(code, {
      filename: "user-code.js",
      timeout: 5000,
      displayErrors: true,
    });

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

    const context = createSafeContext();

    // Handle remote URL fetching
    const remoteUrls = extractFetchUrls(code);
    console.log("remoteUrls", remoteUrls);
    for (const url of remoteUrls) {
      console.log("Fetching", url);
      const remoteCode = await fetchCodeFromCDN(url);
      console.log("importing", url);
      vm.runInContext(remoteCode, context, {
        timeout: 5000,
        displayErrors: true,
      });
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
      const script = new vm.Script(scriptCode, {
        filename: "user-code.js",
        timeout: 5000,
        displayErrors: true,
      });

      const rawResult = script.runInContext(context, {
        timeout: 5000,
        displayErrors: true,
      });

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

    const context = createSafeContext();

    // Handle remote URL fetching
    const remoteUrls = extractFetchUrls(code);
    for (const url of remoteUrls) {
      const remoteCode = await fetchCodeFromCDN(url);
      vm.runInContext(remoteCode, context, {
        timeout: 5000,
        displayErrors: true,
      });
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

    // For async, we'll use a Promise-based approach
    const asyncScript = new vm.Script(
      `
            const asyncFunc = ${scriptCode};
            asyncFunc;
        `,
      {
        filename: "user-code-async.js",
        timeout: 5000,
        displayErrors: true,
      }
    );

    const asyncFunction = asyncScript.runInContext(context, {
      timeout: 5000,
      displayErrors: true,
    });

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
  console.log("Using Node.js built-in VM for sandboxing");
});
