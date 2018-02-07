const assert = require('assert');
const request = require('supertest');
const sinon = require('sinon');
const slack = require('../src/adapters/slack/slack-adapter');

describe('Slack Server/Router Middleware', async () => {
  var slackServer;

  beforeEach(async () => {
    const config = await require('./setup')();
    let slackAdapter = new slack(config);
    //Delete our cached version of the server before each test and reload an instance of the server
    delete require.cache[require.resolve('../src/adapters/slack/server.js')];
    let server = require('../src/adapters/slack/server.js');
    slackServer = new server(slackAdapter);
  })

  afterEach(function (done) {
    //Close our server instance after each test
    slackServer.close(done);
  });

  it('responds to GET requests with valid Slack token', function testGETToken(done) {
    request(slackServer.server)
      .get('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .query({token: process.env.SLACK_VERIFICATION_TOKEN})
      .expect("Hello world, I am Starry", done);
  });

  it('responds to GET requests with 401 in absence of proper Slack authentication token', function testInvalidGETToken(done) {
    request(slackServer.server)
      .get('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(401, done);
  });

  it('responds to POST requests with valid Slack token', function testPOSTToken(done) {
    request(slackServer.server)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({token: process.env.SLACK_VERIFICATION_TOKEN})
      .expect("Hello world, I am Starry", done);
  });

  it('responds to POST requests with 401 in absence of proper Slack authentication token', function testInvalidPOSTToken(done) {
    console.log('test 401');
    request(slackServer.server)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(401, done);
  });

  it('responds to GET requests to /slack/oauth with an authorization code', function testSlackOAuthWithCode(done) {
    let req = {query: {}};
    req.method      = "GET";
    req.query.code  = "abc123";
    req.path        = "/slack/oauth"
    let next        = sinon.spy();
    slackServer.validateToken(req, null, next);
    assert(next.calledOnce);
    done();
  });

  it('responds with 401 to GET requests to /slack/oauth without an authorization code', function testSlackOAuthWithoutCode(done) {
    request(slackServer.server)
      .get('/slack/oauth')
      .expect(401, done);
  });
});
