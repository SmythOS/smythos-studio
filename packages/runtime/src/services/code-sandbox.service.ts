import { Logger } from "@smythos/sre";
import { ChildProcess, spawn } from "child_process";
import path from "path";

const console = Logger("code-sandbox-service");

export class CodeSandboxService {
  private static instance: CodeSandboxService;
  private sandboxProcess: ChildProcess | null = null;
  private readonly sandboxPort = 5055;

  static getInstance(): CodeSandboxService {
    if (!CodeSandboxService.instance) {
      CodeSandboxService.instance = new CodeSandboxService();
    }
    return CodeSandboxService.instance;
  }

  async start(): Promise<void> {
    try {
      const scriptPath = path.join(
        process.cwd(),
        "..",
        "code-sandbox",
        "index.js"
      );

      console.info(`Starting code sandbox service on port ${this.sandboxPort}`);

      this.sandboxProcess = spawn("node", [scriptPath], {
        stdio: ["inherit", "pipe", "pipe"],
        env: { ...process.env },
      });

      this.sandboxProcess.stdout?.on("data", (data) => {
        console.info(`[Code Sandbox] ${data.toString().trim()}`);
      });

      this.sandboxProcess.stderr?.on("data", (data) => {
        console.error(`[Code Sandbox Error] ${data.toString().trim()}`);
      });

      this.sandboxProcess.on("exit", (code, signal) => {
        console.warn(
          `Code sandbox process exited with code ${code} and signal ${signal}`
        );
        this.sandboxProcess = null;
      });

      this.sandboxProcess.on("error", (error) => {
        console.error("Failed to start code sandbox process:", error);
      });

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.info("Code sandbox service started successfully");
    } catch (error) {
      console.error("Failed to start code sandbox service:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.sandboxProcess) {
      console.info("Stopping code sandbox service");
      this.sandboxProcess.kill("SIGTERM");

      // Wait for graceful shutdown, then force kill if needed
      await new Promise((resolve) => {
        if (!this.sandboxProcess) {
          resolve(undefined);
          return;
        }

        const timeout = setTimeout(() => {
          if (this.sandboxProcess) {
            console.warn("Force killing code sandbox process");
            this.sandboxProcess.kill("SIGKILL");
          }
          resolve(undefined);
        }, 5000);

        this.sandboxProcess.on("exit", () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });

      this.sandboxProcess = null;
    }
  }

  isRunning(): boolean {
    return this.sandboxProcess !== null && !this.sandboxProcess.killed;
  }

  getSandboxUrl(): string {
    return `http://localhost:${this.sandboxPort}`;
  }
}
