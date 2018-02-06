const assert = require('assert');
const slackUtils = require('../src/adapters/slack/slack-command-utils');
const slackMessage = require('../src/adapters/slack/slack-message');
const Command = require('../src/adapters/commands/command')

describe('slack-command-utils', () => {
  describe('Extract User Id', () => {
    it('should remove the preceeding "@" and "<" symbols and also remove anything after and including the "|" symbol', () => {
      let unescaped = "<@U12345678|dlohnes>"
      let extracted = slackUtils.extractUserIdFromCommand(unescaped)
      let expectedExtraction = "U12345678"
      assert.equal(expectedExtraction, extracted)
    });

    it("should just return the original userId input if it's unescaped", () => {
      let unescaped = "U12345678"
      let extracted = slackUtils.extractUserIdFromCommand(unescaped)
      let expectedExtraction = unescaped
      assert.equal(expectedExtraction, extracted)
    });
  })

  describe('Slack Command Utils', () => {
    it("should remove extra spaces from a command", () => {
      let extraSpaceInput = "<user_id>   1234      myAddress";
      let spacesRemoved = slackUtils.removeExtraSpacesFromCommand(extraSpaceInput);
      let expectedOutput = "<user_id> 1234 myAddress"
      assert.equal(expectedOutput, spacesRemoved);
    });

    it("should find command params", () => {
      let paramInput = "<user_id> 1234 myAddress";
      let params = slackUtils.findCommandParams(paramInput);
      let expectedOutput = ["<user_id>", "1234", "myAddress"];
      assert.equal(expectedOutput[0], params[0]);
      assert.equal(expectedOutput[1], params[1]);
      assert.equal(expectedOutput[2], params[2]);
    });

    it("should extract tip command params from message", () => {
      let slackMsgBody = {
        token: 'PKT0CQibMhddhKa4IwXv0xSa',
        team_id: 'T8MPK3KV1',
        team_domain: 'starrytest',
        user_id: 'U8PTZ287N',
        user_name: 'd',
        command: '/tip',
        text: '<@U8PTZ333N|d>    123.72',
        response_url: 'https://hooks.slack.com/commands/T8MPK3KV1/300987453926/1Y2q8KAJSLCrFcqAeyDIeNq9' 
      };

      let command = slackUtils.extractCommandParamsFromMessage(new slackMessage(slackMsgBody));
      let expectedAdapter   = "slack";
      let expectedSourceId  = "T8MPK3KV1.U8PTZ287N";
      let expectedTargetId  = "T8MPK3KV1.U8PTZ333N";
      let expectedAmount    = 123.72;
      assert.equal(expectedAdapter, command.adapter);
      assert.equal(expectedSourceId, command.sourceId);
      assert.equal(expectedTargetId, command.targetId);
      assert.equal(expectedAmount, command.amount);
      assert(command instanceof Command.Tip);
    });

    it("should extract withdraw command params from message without optional address specified", () => {
      let slackMsgBody = {
        token: 'PKT0CQibMhddhKa4IwXv0xSa',
        team_id: 'T8MPK3KV1',
        team_domain: 'starrytest',
        user_id: 'U8PTZ287N',
        user_name: 'd',
        command: '/withdraw',
        text: '123.72',
        response_url: 'https://hooks.slack.com/commands/T8MPK3KV1/300987453926/1Y2q8KAJSLCrFcqAeyDIeNq9' 
      };

      let command = slackUtils.extractCommandParamsFromMessage(new slackMessage(slackMsgBody));
      let expectedAdapter   = "slack";
      let expectedSourceId  = "T8MPK3KV1.U8PTZ287N";
      let expectedAmount    = 123.72;
      assert.equal(expectedAdapter, command.adapter);
      assert.equal(expectedSourceId, command.sourceId);
      assert.equal(expectedAmount, command.amount);
      assert.equal(null, command.address);
      assert(command instanceof Command.Withdraw);
    });

    it("should extract withdraw command params from message with optional address specified", () => {
      let slackMsgBody = {
        token: 'PKT0CQibMhddhKa4IwXv0xSa',
        team_id: 'T8MPK3KV1',
        team_domain: 'starrytest',
        user_id: 'U8PTZ287N',
        user_name: 'd',
        command: '/withdraw',
        text: '123.72 GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN',
        response_url: 'https://hooks.slack.com/commands/T8MPK3KV1/300987453926/1Y2q8KAJSLCrFcqAeyDIeNq9' 
      };

      let command = slackUtils.extractCommandParamsFromMessage(new slackMessage(slackMsgBody));
      let expectedAdapter   = "slack";
      let expectedSourceId  = "T8MPK3KV1.U8PTZ287N";
      let expectedAmount    = 123.72;
      let expectedAddress   = "GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN";
      assert.equal(expectedAdapter, command.adapter);
      assert.equal(expectedSourceId, command.sourceId);
      assert.equal(expectedAmount, command.amount);
      assert.equal(expectedAddress, command.address);
      assert(command instanceof Command.Withdraw);
    });

    it("should extract register command params from message", () => {
      let slackMsgBody = {
        token: 'PKT0CQibMhddhKa4IwXv0xSa',
        team_id: 'T8MPK3KV1',
        team_domain: 'starrytest',
        user_id: 'U8PTZ287N',
        user_name: 'd',
        command: '/register',
        text: 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN',
        response_url: 'https://hooks.slack.com/commands/T8MPK3KV1/300987453926/1Y2q8KAJSLCrFcqAeyDIeNq9' 
      };

      let command = slackUtils.extractCommandParamsFromMessage(new slackMessage(slackMsgBody));
      let expectedAdapter   = "slack";
      let expectedSourceId  = "T8MPK3KV1.U8PTZ287N";
      let expectedPublicKey    = "GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN";
      assert.equal(expectedAdapter, command.adapter);
      assert.equal(expectedSourceId, command.sourceId);
      assert.equal(expectedPublicKey, command.walletPublicKey);
      assert(command instanceof Command.Register);
    });

    it("should extract info command params from message", () => {
      let slackMsgBody = {
        token: 'PKT0CQibMhddhKa4IwXv0xSa',
        team_id: 'T8MPK3KV1',
        team_domain: 'starrytest',
        user_id: 'U8PTZ287N',
        user_name: 'd',
        command: '/info',
        text: 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN',
        response_url: 'https://hooks.slack.com/commands/T8MPK3KV1/300987453926/1Y2q8KAJSLCrFcqAeyDIeNq9'
      };

      let command = slackUtils.extractCommandParamsFromMessage(new slackMessage(slackMsgBody));
      let expectedAdapter   = "slack";
      let expectedSourceId  = "T8MPK3KV1.U8PTZ287N";
      assert.equal(expectedAdapter, command.adapter);
      assert.equal(expectedSourceId, command.sourceId);
      assert(command instanceof Command.Info);
    });
  });
})
