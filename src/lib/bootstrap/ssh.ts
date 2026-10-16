import { Client, type ConnectConfig } from "ssh2";

export type SshAuth = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
};

export type SshExecResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function connect(auth: SshAuth): Promise<Client> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const config: ConnectConfig = {
      host: auth.host,
      port: auth.port,
      username: auth.username,
      readyTimeout: 30_000,
      // Fresh VPS host keys change; we only reach hosts the admin typed in.
      hostVerifier: () => true,
    };
    if (auth.privateKey?.trim()) {
      config.privateKey = auth.privateKey;
    } else if (auth.password) {
      config.password = auth.password;
    } else {
      reject(new Error("ssh_auth_missing"));
      return;
    }

    client
      .on("ready", () => resolve(client))
      .on("error", (error) => reject(error))
      .connect(config);
  });
}

export async function sshExec(auth: SshAuth, command: string, timeoutMs = 600_000): Promise<SshExecResult> {
  const client = await connect(auth);
  try {
    return await new Promise<SshExecResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end();
        reject(new Error("ssh_timeout"));
      }, timeoutMs);

      client.exec(command, (error, stream) => {
        if (error) {
          clearTimeout(timer);
          reject(error);
          return;
        }

        let stdout = "";
        let stderr = "";
        stream
          .on("close", (code: number | null) => {
            clearTimeout(timer);
            resolve({ code: code ?? 1, stdout, stderr });
          })
          .on("data", (chunk: Buffer | string) => {
            stdout += chunk.toString();
          });
        stream.stderr.on("data", (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });
      });
    });
  } finally {
    client.end();
  }
}

/** Upload a script via base64 and run under bash (avoids quoting hell). */
export async function sshRunScript(auth: SshAuth, script: string, timeoutMs = 600_000) {
  const b64 = Buffer.from(script, "utf8").toString("base64");
  const command = `bash -lc 'echo ${b64} | base64 -d | bash -s'`;
  return sshExec(auth, command, timeoutMs);
}
