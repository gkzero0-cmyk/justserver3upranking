const legacyHandler = require('./applicant-detail.js');

async function handler(req, res) {
  return legacyHandler(req, res);
}

handler._test = { ...(legacyHandler._test || {}), apiVersion: 'v2' };
module.exports = handler;
