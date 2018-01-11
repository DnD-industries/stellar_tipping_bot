const assert = require('assert');
const request = require('supertest');

describe('slackAdapter', async () => {
  let slackAdapter;

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

  it('responds to /', function testSlash(done) {
    request(slackServer)
      .get('/')
      .query({token: process.env.SLACK_VERIFICATION_TOKEN})
      .expect("Hello world, I am Starry", done);
  });
    
  it('responds with 401 in absence of proper Slack authentication token', function testSlackToken(done) {
    console.log('test 401');
    request(slackServer)
      .post('/slack/tip')
      .expect(401, done);
  });
});
