require('dotenv').config();

const PORT = process.env.PORT || 9015;
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios').create({
  timeout: 60000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  maxRedirects: 10
});

const quotes = require('./quotes');
const { initIndex, getQuoteByWord } = require('./word-index');
const isProd = process.env.NODE_ENV === 'production';

// Initialize the Express app
const app = express();

// Capture raw body for Slack Signing Secret verification if configured
const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
};

app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, verify: rawBodySaver }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/slack-ron-swanson-quote-bot', express.static(publicDir));

initIndex();

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(req.method, req.url);
  }
  next();
});

/**
 * Verifies incoming Slack webhook requests using either SLACK_SIGNING_SECRET (v0 HMAC-SHA256)
 * or legacy SLACK_VERIFICATION_TOKEN.
 */
function isValidSlackRequest(req) {
  if (!isProd) {
    return true;
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];

  if (signingSecret && signature && timestamp) {
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (Number(timestamp) < fiveMinutesAgo) {
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${req.rawBody || ''}`;
    const mySignature =
      'v0=' +
      crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const mySigBuffer = Buffer.from(mySignature, 'utf8');
    return (
      sigBuffer.length === mySigBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, mySigBuffer)
    );
  }

  return Boolean(req.body && req.body.token === process.env.SLACK_VERIFICATION_TOKEN);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    quotesCount: quotes.length
  });
});

// Public JSON API endpoint for fetching a random or topic-matched quote
app.get('/api/quote', (req, res) => {
  const query = req.query.text || req.query.q || '';
  const quoteObj = getQuoteByWord(query);
  res.json(quoteObj);
});

// Slack Slash Command endpoint
app.post('/ron', (req, res) => {
  if (!isValidSlackRequest(req)) {
    res.status(400).send('Invalid request.');
    return;
  }

  const text = req.body && typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (text.toLowerCase() === 'help') {
    res.json({
      response_type: 'ephemeral',
      text: 'Type `/ron` for a random Ron Swanson quote, or `/ron <topic>` (e.g. `/ron bacon`, `/ron yoga`, `/ron canvas`) to get a quote matching your topic.'
    });
    return;
  }

  const quoteObj = getQuoteByWord(text);
  log(quoteObj, req);

  res.json({
    response_type: 'in_channel',
    text: quoteObj.quote
  });
});

// If the user authorizes your app, Slack will redirect back to your specified redirect_uri with a temporary code in a code GET parameter
app.get('/slack-oauth', (req, res) => {
  if (!req.query.code) {
    res.status(403).send('Access denied.');
    return;
  }

  // Exchange temporary auth code for access token
  getToken(req.query.code)
    .then(getTeamDomain)
    .then(teamDomain => res.redirect(`https://${teamDomain}.slack.com`))
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Uh oh.');
    });
});

function getToken(authCode) {
  const data = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: authCode
  };

  return axios
    .get(`https://slack.com/api/oauth.access?${querystring.stringify(data)}`)
    .then(response => {
      if (response.status === 200 && response.data.ok) {
        return response.data.access_token;
      }
      throw new Error(`Unable to get token: ${response.data.error}`);
    });
}

function getTeamDomain(token) {
  return axios
    .get(`https://slack.com/api/team.info?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      if (response.data.ok && response.data.team) {
        return response.data.team.domain;
      }
      throw new Error(`Unable to get team domain: ${response.data.error}`);
    });
}

function log(quoteObj, req) {
  if (process.env.NODE_ENV === 'test') return;
  const body = req.body || {};
  console.log(
    `Team domain: "${body.team_domain || ''}", Channel name: "${body.channel_name || ''}", User: "${body.user_name || ''}", Date: ${new Date().toLocaleString()}`
  );
  console.log(JSON.stringify(quoteObj, null, 2));
}

if (require.main === module) {
  http.createServer(app).listen(PORT, () => {
    console.log(`Server started on *:${PORT}`);
  });
}

module.exports = app;
