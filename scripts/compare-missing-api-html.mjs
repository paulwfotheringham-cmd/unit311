import https from "node:https";
import { URL } from "node:url";

function request(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers: {
          ...headers,
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            setCookie: res.headers["set-cookie"] || [],
          }),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function cookieHeader(setCookies) {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

const login = await request("https://unit311central.com/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    username: "qa.accept.1784479956140",
    password: "QaAccept!66fe8e43",
  }),
});
const cookie = cookieHeader(login.setCookie);

const urls = [
  ["POST", "https://internal.unit311central.com/api/clients/x/mark-payment-received"],
  ["GET", "https://internal.unit311central.com/api/clients/x/mark-payment-received"],
  ["POST", "https://internal.unit311central.com/api/this-route-does-not-exist-xyz"],
  ["GET", "https://internal.unit311central.com/api/this-route-does-not-exist-xyz"],
  ["GET", "https://internal.unit311central.com/api/potential-clients"],
  ["GET", "https://internal.unit311central.com/api/clients"],
];

for (const [method, url] of urls) {
  const withAuth = await request(url, {
    method,
    headers: { Cookie: cookie },
  });
  const noAuth = await request(url, { method });
  const title = (html) => {
    const m = html.match(/<title>([^<]*)<\/title>/);
    return m ? m[1] : "(no title)";
  };
  const matched = (r) => r.headers["x-matched-path"] || "";
  console.log(
    JSON.stringify({
      method,
      path: url.replace("https://internal.unit311central.com", ""),
      auth: {
        status: withAuth.status,
        ct: withAuth.headers["content-type"],
        matched: matched(withAuth),
        title: title(withAuth.body),
        html: /^\s*</.test(withAuth.body),
      },
      noAuth: {
        status: noAuth.status,
        ct: noAuth.headers["content-type"],
        matched: matched(noAuth),
        title: title(noAuth.body),
        html: /^\s*</.test(noAuth.body),
        preview: noAuth.body.slice(0, 80).replace(/\s+/g, " "),
      },
    }),
  );
}
