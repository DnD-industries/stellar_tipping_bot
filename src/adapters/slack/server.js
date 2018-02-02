const express       = require('express');
const app           = express();
const bodyParser    = require('body-parser');
const slackMessage  = require('./slack-message');
const slackUtils    = require('./slack-command-utils');
const slackClient   = require('./slack-client');
const SlackAdapter  = require('../slack/slack-adapter');
// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
// In our case we use an xoxb bot token
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;
const redis = require('redis');
const CommandQueue = require('./slack-command-queue')

const MESSAGE_FLUSH_INTERVAL = 1; // milliseconds

const REQUEST_BEING_PROCESSED = "Your request is being processed.";

/**
 * SlackServer handles all post calls coming from Slack slash commands.
 */
class SlackServer {

  /**
   *
   * @param slackAdapter {SlackAdapter}
   */
  constructor(slackAdapter) {
    var that = this; // Allows us to keep reference to 'this' even in closures, wherein "this" will actually mean the closure we are inside of in that context
    this.adapter = slackAdapter;
    this.client = new slackClient(oauth_token);
    try{
      console.log("Connecting to redis url:", process.env.REDIS_URL);
      this.CommandQueue = new CommandQueue(redis.createClient(process.env.REDIS_URL));
    } catch (exc) {
      throw new Error(exc);
    }
    // Set up express app
    app.set('port', (process.env.PORT || 5000));

    // Process application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({extended: false}))

    //Middleware to perform token validation for slash requests coming from Slack
    app.use(function (req, res, next) {
      if(process.env.MODE === "development"){
        console.log('Request received at', Date.now());
        console.log(req.headers);
        console.log(JSON.stringify(req.body));
      }

      //If this is a GET request, use the query token, otherwise look for it in the body
      let token = req.method === "GET" ? req.query.token : req.body.token;
      //With the proper validation token from Slack, route the request accordingly.
      //Otherwise reply with a 401 status code
      token === process.env.SLACK_VERIFICATION_TOKEN ? next() : res.status(401).send("Invalid Slack token");
    });

    // Index route
    app.all('/', function (req, res) {
      res.send('Hello world, I am Starry');
    });

    /**
     * Set up how /tip command should be dealt with
     */
    app.post('/slack/tip', async function (req, res) {
      console.log('Tip requested');
      let msg = new slackMessage(req.body);
      console.log(msg);
      console.log("Unique user id: " + msg.uniqueUserID);

      let recipientID= slackUtils.extractUserIdFromCommand(msg.text);
      console.log("recipient: ", recipientID);

      let command = slackUtils.extractCommandParamsFromMessage(msg);

      res.send(await that.adapter.handleCommand(command));
    });


    /**
     * Set up how /withdraw command should be dealt with
     */
    app.post('/slack/withdraw', async function (req, res) {
      console.log('someone wants to make a withdrawal!');
      console.log(JSON.stringify(req.body));
      let msg = new slackMessage(req.body);
      let command = slackUtils.extractCommandParamsFromMessage(msg);

      that.CommandQueue.pushCommand(command);

      res.send(REQUEST_BEING_PROCESSED);
    });

    /**
     * Set up how /register command should be dealt with
     */
    app.post('/slack/register', async function (req, res) {
      console.log('someone wants to register!');
      console.log(JSON.stringify(req.body));
      let msg = new slackMessage(req.body);
      let command = slackUtils.extractCommandParamsFromMessage(msg);

      res.send(await that.adapter.handleCommand(command));
    });

    /**
     * Set up how /balance command should be dealt with
     */
    app.post('/slack/balance', async function (req, res) {
      console.log('someone wants to check their balance');
      console.log(JSON.stringify(req.body));
      let msg = new slackMessage(req.body);
      let command = slackUtils.extractCommandParamsFromMessage(msg);

      res.send(await that.adapter.handleCommand(command));
    });

    /**
     * Set up how /balance command should be dealt with
     */
    app.post('/slack/info', async function (req, res) {
      let msg = new slackMessage(req.body);
      let command = slackUtils.extractCommandParamsFromMessage(msg);

      res.send(await that.adapter.handleCommand(command));
    });


    // Spin up the server
    this.server = app.listen(app.get('port'), function() {
      console.log('slackbot running on port', app.get('port'));

      setInterval(that.flushCommandQueue, MESSAGE_FLUSH_INTERVAL, that);
    });
  }

  flushCommandQueue(slackServer) {
    // TODO: Going to need to refactor this when we get OAuth working so that we don't include the client at this time
    slackServer.CommandQueue.flush(slackServer.adapter, slackServer.client);
  }

  close(done){
    this.server.close(done);
  }
}

module.exports = SlackServer
