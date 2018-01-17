const express       = require('express');
const app           = express();
const bodyParser    = require('body-parser');
const slackMessage  = require('./slack-message');
const slackUtils    = require('./slack-command-utils');
const slackClient   = require('./slack-client');
// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
// In our case we use an xoxb bot token
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;

class SlackServer {

  /**
   *
   * @param slackAdapter A Slack:Adapter object
   */
  constructor(slackAdapter) {
    var that = this; // Allows us to keep reference to 'this' even in closures, wherein "this" will actually mean the closure we are inside of in that context
    this.adapter = slackAdapter;
    this.client = new slackClient(oauth_token);
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
      token === process.env.SLACK_VERIFICATION_TOKEN ? next() : res.sendStatus(401).send("Invalid Slack token");
    });

    // Index route
    app.all('/', function (req, res) {
      res.send('Hello world, I am Starry');
    });

    app.post('/slack/tip', function (req, res) {
      console.log('Tip requested');
      let msg = new slackMessage(req.body);
      console.log(msg);
      console.log("Unique user id: " + msg.uniqueUserID);

      let recipientID= slackUtils.extractUserIdFromCommand(msg.text);
      console.log("recipient: ", recipientID);
      //msgAttachment = msg.formatSlackAttachment("Great tip!", "good", "10 XLM sent to user");
      //Implement business logic and send DMs accordingly
      that.client.sendPlainTextDMToSlackUser(msg.user_id, "You sent a tip");

      that.client.sendPlainTextDMToSlackUser(recipientID, "Got tip");
      // If the user is not registered, return an error appropriate. Maybe instruct them how to register
      // else if the user is registered
      // Check the amount against the user's current balance
      // If the user's balance is not high enough, return an error containing the current balance
      // If the user's balance is high enough, first identify the receiver by retreiving their user_id (UUID) then check if the receiver is already registered
      // If a user does not exist in the db with their particular info,
      // Add them to the database without a public wallet address (the real mark of not being registered)
      // Save the tip info in the database
      //
      // Else-If a user DOES exist in the db with their particlar inof
      // Make the transfer happen
      // If failure
      // send an appropriate message to the tipper
      // If success
      // remove the tip from the sender's balance
      // add the tip to the receiver's balance
      // send a success message to the sender
      // send a personal message to the receiver alerting them they received a tip
      res.json(200);
    });

    app.post('/slack/withdraw', function (req, res) {
      console.log('someone wants to make a withdrawal!');
      console.log(JSON.stringify(req.body));
      res.sendStatus(200);

      // If the user is not registered, return an error appropriate. Maybe instruct them how to register
      // else if the user is registered
      // Check the amount against the user's current balance
      // If the user's balance is not high enough, return an error containing the current balance
      // If the user's balance is high enough, make the withdrawal and send a message depending on success or failure
    });

    app.post('/slack/register', async function (req, res) {
      console.log('someone wants to register!');
      console.log(JSON.stringify(req.body));
      let msg = new slackMessage(req.body);

      console.log("Here extraction")
      let command = slackUtils.extractCommandParamsFromMessage(msg);
      console.log("After extraction")
      res.sendStatus(await that.adapter.handleRegistrationRequest(command))
    });

    // Spin up the server
    this.server = app.listen(app.get('port'), function() {
      console.log('slackbot running on port', app.get('port'));
    });
  }

  close(done){
    this.server.close(done);
  }
}

module.exports = SlackServer
