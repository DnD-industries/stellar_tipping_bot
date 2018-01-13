const express     = require('express');
const bodyParser  = require('body-parser');
const app         = express();
const slmessage   = require('./slack-message');
const slackUtils  = require('./utils');
const SlackClient = require('./client')
// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
// In our case we use an xoxb bot token
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;

class SlackServer {

  /**
   *
   * @param slackAdapter A Slack:Adapter object
   */
  constructor(slackAdapter) {
    var that = this;
    this.adapter = slackAdapter;
    this.client = new SlackClient(oauth_token);


    /// Set up express app
    app.set('port', (process.env.PORT || 5000));

    // Process application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({extended: false}))

    // Index route
    app.get('/', function (req, res) {
      res.send('Hello world, I am a chat bot');
    });

    app.post('/slack/tip', function (req, res) {
      console.log('Tip requested');
      let msg = new slmessage(req.body);
      console.log(msg);
      console.log("Unique user id: " + msg.uniqueUserID);

      let recipientID= slackUtils.extractUserIdFromCommand(msg.text);
      console.log("recipient: ", recipientID);
      //msgAttachment = msg.formatSlackAttachment("Great tip!", "good", "10 XLM sent to user");
      //Implement business logic and send DMs accordingly
      msg.sendDMToSlackUser(msg.user_id, msg.formatSlackAttachment("Great tip!", "good", "XLM sent to user"));

      msg.sendDMToSlackUser(recipientID, msg.formatSlackAttachment("Tip Received!", "good", "XLM sent to you!"));
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
      console.log('someone wants to make a withdrawal!')
      console.log(JSON.stringify(req.body))
      res.sendStatus(200);

      // If the user is not registered, return an error appropriate. Maybe instruct them how to register
      // else if the user is registered
      // Check the amount against the user's current balance
      // If the user's balance is not high enough, return an error containing the current balance
      // If the user's balance is high enough, make the withdrawal and send a message depending on success or failure

    });

    app.post('/slack/register', function (req, res) {
      console.log('someone wants to register!')
      console.log(JSON.stringify(req.body))
      let msg = new slmessage(req.body);
      let recipientID= slackUtils.extractUserIdFromCommand(msg.text);
      that.client.sendDMToSlackUser(msg.user_id, "This is coming from register");
      that.client.sendAttachmentsToSlackUser(recipientID, that.client.formatSlackAttachment("Tip Received!", "good", "XLM sent to you!"));

      // that.adapter.handleRegistrationRequest(msg).then((messageToRegisterer) => {
      //   // What we do no matter what the outcome is
      //   res.sendStatus(200).send(messageToRegisterer)
      // }).catch((messageToRegisterer) => {
      //   res.sendStatus(401).send(messageToRegisterer)
      // })

      // Validate their wallet address
      // If the user is already registered, send them a message back explaining (and what their Wallet Address is)
      // If the user is not already registered
      // Make sure no one else has already registered that same wallet address
      // Save to the database
      // Send them a message back (error if applicable)


      // res.sendStatus(200);

    });

    // Spin up the server
    app.listen(app.get('port'), function() {
      console.log('slackbot running on port', app.get('port'))
    });
  }
}

module.exports = SlackServer
