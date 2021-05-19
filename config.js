const fs = require('fs');
const dbconfig = {
    user: "dev",
    password: "mobilemarket",
    host: "free-tier.gcp-us-central1.cockroachlabs.cloud",
    database: "narrow-lynx-1825.mobilemarket",
    port: 26257,
    ssl: {
          ca: fs.readFileSync('./certs/cc-ca.crt')
              .toString()
      }
  };
module.exports = {dbconfig};