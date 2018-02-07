const express       = require('express');
const app           = express();
const bodyParser    = require('body-parser');
const slackMessage  = require('./slack-message');
const slackUtils    = require('./slack-command-utils');
const slackClient   = require('./slack-client');
const SlackAdapter  = require('../slack/slack-adapter');
const CommandQueue  = require('./slack-command-queue');
const request       = require('request-promise');
const redis         = require('redis');
//Redis consts
const MESSAGE_FLUSH_INTERVAL = 1; // milliseconds
const REQUEST_BEING_PROCESSED = "Your request is being processed.";

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
// In our case we use an xoxb bot token
const oauth_token   = process.env.SLACK_BOT_OAUTH_TOKEN;

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
        console.log("Request received at:", Date.now());
        console.log("Request path:",req.path);
        console.log("Headers:", JSON.stringify(req.headers));
        console.log("Body/Query:", req.method === "GET" ? req.query : JSON.stringify(req.body));
      }

      //Allow the request to proceed if it is a GET request to authorize the app being added to a Slack team
      if (req.method === "GET" && req.path === "/slack/oauth") {
        //Check for the presence of an authorization code
        if (req.query.code) {
          next();
        } else {
          res.status(401).send("Missing Slack authorization code");
        }
      } else {
        //If this is a GET request, use the query token, otherwise look for it in the body
        let token = req.method === "GET" ? req.query.token : req.body.token;
        //With the proper validation token from Slack, route the request accordingly.
        //Otherwise reply with a 401 status code
        token === process.env.SLACK_VERIFICATION_TOKEN ? next() : res.status(401).send("Invalid Slack token");
      }
    });

    // Index route
    app.all('/', function (req, res) {
      res.send('Hello world, I am Starry');
    });

    // Example: /slack/oauth?code=309294713090.310353154935.c44bf12345a25f6bdfe004dd2b0f6006c451c69a0d4745cc2888677024c4ab7d&state=
    //
    // {
    //   "access_token": "xoxp-XXXXXXXX-XXXXXXXX-XXXXX",
    //   "scope": "incoming-webhook,commands,bot",
    //   "team_name": "Team Installing Your Hook",
    //   "team_id": "XXXXXXXXXX",
    //   "incoming_webhook": {
    //       "url": "https://hooks.slack.com/TXXXXX/BXXXXX/XXXXXXXXXX",
    //       "channel": "#channel-it-will-post-to",
    //       "configuration_url": "https://teamname.slack.com/services/BXXXXX"
    //   },
    //   "bot":{
    //       "bot_user_id":"UTTTTTTTTTTR",
    //       "bot_access_token":"xoxb-XXXXXXXXXXXX-TTTTTTTTTTTTTT"
    //   }
    // }
    app.get('/slack/oauth', async function (req, res) {
      // console.log("auth code:",req.query.code);
      // console.log("original redirect url:", req.hostname + req.url);
      let reqOptions = {
        method: 'POST',
        uri: 'https://slack.com/api/oauth.access',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id     : process.env.SLACK_APP_CLIENT_ID,
          client_secret : process.env.SLACK_APP_CLIENT_SECRET,
          code          : req.query.code/*,
          redirect_uri  : "https://" + req.hostname + req.url*/
        }
      };
      console.log("request options:", JSON.stringify(reqOptions));

      //We will be sending text back regardless of the result, so set the content type now
      res.set('Content-Type', 'text/html');
      try {
        let oauthResponse = await request(reqOptions);
        console.log("Slack OAuth Response:", JSON.stringify(oauthResponse, 2));
        //Handle failure response from Slack
        oauthResponse = JSON.parse(oauthResponse);
        console.log("team_id:", oauthResponse.team_id);
        console.log("response ok", oauthResponse.ok);
        if(oauthResponse.ok) {
          //Save tokens
          let tokenCreationResult = await that.adapter.receiveNewAuthTokensForTeam(oauthResponse.team_id, 
                                              oauthResponse.access_token, 
                                              oauthResponse.bot.bot_access_token);
          res.status(200).send(tokenCreationResult);
        } else {
          throw new Error("OAuth response from Slack failed. Please try again.");
        }
      } catch (exc) {
        //Handle exception from slack oauth request
        console.error("Caught exception:", exc);
        res.status(401).send(exc.message);
        return;
      }        
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
    slackServer.CommandQueue.flush(slackServer.adapter);
  }

  close(done){
    this.server.close(done);
  }
}

module.exports = SlackServer
