
const crypto = require("crypto");
const { Resolver } = require("dns").promises;
const fs = require("fs");
const http = require("http");

/**
 * Generate an bitcoin-core rpcauth credential like https://github.com/bitcoin/bitcoin/blob/master/share/rpcauth/rpcauth.py.
 * @returns {{password, salt, hash, username}}
 */
function genRpcAuth() {
  const username = "lnd";
  const password = crypto.randomBytes(32).toString("base64url");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return {username, password, salt, hash};
}

/**
 * Get external IP address using https://api.ipify.org/
 * @returns {Promise<string>}
 */
function getExternalIpAddress() {
  return new Promise((resolve) => {
    http.get({host: "api.ipify.org", port: 80, path: "/"}, function(resp) {
      resp.on("data", function(ip) {
        resolve(ip.toString());
      });
    })
  });
}

/**
 * Get the domain name.
 * @param ip
 * @returns {Promise<string>}
 */
function getDomain(ip) {
  const resolver = new Resolver();
  return resolver.reverse(ip);
}

async function main() {
  const {password, salt, hash, username} = genRpcAuth();
  const externalip = await getExternalIpAddress();

  const env = `# ALLOWANCE CONFIGURATION

# Name of your node within the lighting network (up to 32 characters)
ALIAS=

# RPCAUTH/RPCPASS secures the rpc interface of bitcoin-core
RPCAUTH=${username}:${salt}$${hash}
RPCPASS=${password}

# Address of this node
EXTERNALIP=${externalip}
HOST=${await getDomain(externalip)}

# To automatically unlock lnd, create lnd/password.txt and set this to /root/.lnd/password.txt
WALLET_UNLOCK_PASSWORD_FILE=
`;

  await fs.writeFileSync(".env", env);
  console.log(env);
}

main();
