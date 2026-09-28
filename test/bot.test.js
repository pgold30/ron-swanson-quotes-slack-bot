const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const quotes = require('../quotes');
const { initIndex, getQuoteByWord } = require('../word-index');
const app = require('../index');

describe('Ron Swanson Quotes & Word Index', () => {
  before(() => {
    initIndex();
  });

  it('contains all expected quotes without duplicates', () => {
    assert.ok(quotes.length >= 90, 'Should have at least 90 quotes');

    const requiredQuotes = [
      'Ann: Do you have any history of mental illness in your family? \nRon: I have an uncle who does yoga.',
      'It’s pointless for a human to paint scenes of nature when they can go outside and stand in it.',
      'Normally, if given the choice between doing something and nothing, I’d choose to do nothing. But I will do something if it helps someone else do nothing. I’d work all night, if it meant nothing got done.',
      'That is a canvas sheet, the most versatile object known to man. It can be used to make tents, backpacks, shoes, stretchers, sails, tarpaulins, and I suppose, in the most dire of circumstances, it can be a surface on which to make art.'
    ];

    for (const q of requiredQuotes) {
      assert.ok(quotes.includes(q), `Missing required quote: ${q}`);
    }

    const uniqueQuotes = new Set(quotes);
    assert.equal(uniqueQuotes.size, quotes.length, 'Should not contain exact duplicate quotes');
  });

  it('returns a random quote when no word is provided', () => {
    const res1 = getQuoteByWord('');
    assert.equal(res1.wasFound, false);
    assert.ok(quotes.includes(res1.quote));

    const res2 = getQuoteByWord(undefined);
    assert.equal(res2.wasFound, false);
    assert.ok(quotes.includes(res2.quote));

    const res3 = getQuoteByWord(null);
    assert.equal(res3.wasFound, false);
    assert.ok(quotes.includes(res3.quote));
  });

  it('matches single-word topics accurately', () => {
    const manly = getQuoteByWord('manly');
    assert.equal(manly.wasFound, true);
    assert.match(manly.quote, /manly musk/i);

    const canvas = getQuoteByWord('canvas');
    assert.equal(canvas.wasFound, true);
    assert.match(canvas.quote, /canvas sheet/i);

    const tamara = getQuoteByWord('Tamara');
    assert.equal(tamara.wasFound, true);
    assert.match(tamara.quote, /Tamara/i);
  });

  it('matches multi-word queries and scores best matches', () => {
    const mentalYoga = getQuoteByWord('mental illness yoga');
    assert.equal(mentalYoga.wasFound, true);
    assert.match(mentalYoga.quote, /uncle who does yoga/i);

    const naturePaint = getQuoteByWord('paint scenes of nature');
    assert.equal(naturePaint.wasFound, true);
    assert.match(naturePaint.quote, /paint scenes of nature/i);

    const workAllNight = getQuoteByWord('work all night nothing');
    assert.equal(workAllNight.wasFound, true);
    assert.match(workAllNight.quote, /work all night/i);
  });

  it('handles singular/plural variations', () => {
    const tarpaulin = getQuoteByWord('tarpaulin');
    assert.equal(tarpaulin.wasFound, true);
    assert.match(tarpaulin.quote, /tarpaulins/i);
  });
});

describe('Express Server Endpoints', () => {
  let server;
  let baseUrl;

  before((_, done) => {
    server = http.createServer(app).listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  it('GET /health returns status and quote count', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.quotesCount, quotes.length);
  });

  it('GET /api/quote returns matching quote JSON', async () => {
    const res = await fetch(`${baseUrl}/api/quote?text=canvas`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.wasFound, true);
    assert.match(body.quote, /canvas sheet/i);
  });

  it('POST /ron returns Slack in_channel quote response', async () => {
    const res = await fetch(`${baseUrl}/ron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'text=manly'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response_type, 'in_channel');
    assert.match(body.text, /manly musk/i);
  });

  it('POST /ron with help returns ephemeral usage info', async () => {
    const res = await fetch(`${baseUrl}/ron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'text=help'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response_type, 'ephemeral');
    assert.match(body.text, /\/ron/);
  });
});
