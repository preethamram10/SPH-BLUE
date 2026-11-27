import net from "net";
import tls from "tls";

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
}

function readSmtpLine(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        // Multi-line SMTP responses have '-' at index 3; final line has ' '
        if (/^\d{3} /.test(line)) {
          cleanup();
          resolve(buffer.trim());
          return;
        }
      }
    };
    const onErr = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onErr);
    };
    socket.on("data", onData);
    socket.on("error", onErr);
  });
}

async function sendCmd(
  socket: net.Socket | tls.TLSSocket,
  cmd: string,
  expectedPrefix: string
): Promise<void> {
  socket.write(`${cmd}\r\n`);
  const resp = await readSmtpLine(socket);
  if (!resp.startsWith(expectedPrefix)) {
    throw new Error(`SMTP error (${cmd.split(" ")[0]}): ${resp}`);
  }
}

/**
 * Lightweight zero-dependency SMTP mail sender supporting SSL/TLS (port 465) and STARTTLS (port 587).
 */
export async function sendEmail(opts: SendMailOptions): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !pass || !from) {
    return {
      ok: false,
      error: "Email service (SMTP) is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env.",
    };
  }

  let socket: net.Socket | tls.TLSSocket | null = null;
  try {
    if (port === 465) {
      socket = tls.connect({ host, port, servername: host });
    } else {
      socket = net.connect({ host, port });
    }
    socket.setTimeout(12000);

    const greeting = await readSmtpLine(socket);
    if (!greeting.startsWith("220")) {
      throw new Error(`SMTP greeting failed: ${greeting}`);
    }

    await sendCmd(socket, `EHLO localhost`, "250");

    if (port !== 465) {
      await sendCmd(socket, `STARTTLS`, "220");
      socket = tls.connect({ socket: socket as net.Socket, servername: host });
      await sendCmd(socket, `EHLO localhost`, "250");
    }

    await sendCmd(socket, `AUTH LOGIN`, "334");
    await sendCmd(socket, Buffer.from(user).toString("base64"), "334");
    await sendCmd(socket, Buffer.from(pass).toString("base64"), "235");

    await sendCmd(socket, `MAIL FROM:<${from}>`, "250");
    await sendCmd(socket, `RCPT TO:<${opts.to}>`, "250");
    await sendCmd(socket, `DATA`, "354");

    const mime =
      `From: Spiritual Homeopathy <${from}>\r\n` +
      `To: <${opts.to}>\r\n` +
      `Subject: ${opts.subject}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `\r\n` +
      `${opts.text}\r\n.\r\n`;

    socket.write(mime);
    const dataResp = await readSmtpLine(socket);
    if (!dataResp.startsWith("250")) {
      throw new Error(`SMTP DATA rejected: ${dataResp}`);
    }

    try {
      socket.write("QUIT\r\n");
    } catch {}
    socket.end();
    return { ok: true };
  } catch (err: any) {
    try {
      socket?.destroy();
    } catch {}
    return { ok: false, error: err?.message || "Failed to send email." };
  }
}
