const assert = require('assert');
const request = require('supertest');

describe('Slack Server/Router', async () => {
  var slackServer;

  beforeEach(async () => {
    const config = await require('./setup')();
    //Delete our cached version of the server before each test and reload an instance of the server
    delete require.cache[require.resolve('../src/adapters/slack/index.js')];
    let slackIndex = require('../src/adapters/slack/index.js');
    slackServer = slackIndex.server;
    //slackServer = require('../src/adapters/slack/index.js');
  })

  afterEach(function (done) {
    //Close our server instance after each test
    slackServer.close(done);
  });

  it('responds to GET requests with valid Slack token', function testGETToken(done) {
    request(slackServer)
      .get('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .query({token: process.env.SLACK_VERIFICATION_TOKEN})
      .expect("Hello world, I am Starry", done);
  });
    
  it('responds to GET requests with 401 in absence of proper Slack authentication token', function testInvalidGETToken(done) {
    console.log('test 401');
    request(slackServer)
      .get('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(401, done);
  });

  it('responds to POST requests with valid Slack token', function testPOSTToken(done) {
    request(slackServer)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({token: process.env.SLACK_VERIFICATION_TOKEN})
      .expect("Hello world, I am Starry", done);
  });
    
  it('responds to POST requests with 401 in absence of proper Slack authentication token', function testInvalidPOSTToken(done) {
    console.log('test 401');
    request(slackServer)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(401, done);
  });
});
