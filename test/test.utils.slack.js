const assert = require('assert')
const slackUtils = require('../src/adapters/slack/slack-command-utils')

describe('slack-utils', () => {
  describe('extract user id', () => {
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

    it("should remove extra spaces from a command", () => {
      let extraSpaceInput = "<user_id>   1234      myAddress";
      let spacesRemoved = slackUtils.removeExtraSpacesFromCommand(extraSpaceInput);
      let expectedOutput = "<user_id> 1234 myAddress"
      assert.equal(expectedOutput, spacesRemoved);
    });

    it("should find command delimiter indices", () => {
      let paramInput = "<user_id> 1234 myAddress";
      let paramIndices = slackUtils.findCommandDelimiterIndices(paramInput);
      let expectedOutput = [9, 14];
      assert.equal(expectedOutput[0], paramIndices[0]);
      assert.equal(expectedOutput[1], paramIndices[1]);
    });

    it("should find command params", () => {
      let paramInput = "<user_id> 1234 myAddress";
      let params = slackUtils.findCommandParams(paramInput);
      let expectedOutput = ["<user_id>", "1234", "myAddress"];
      assert.equal(expectedOutput[0], params[0]);
      assert.equal(expectedOutput[1], params[1]);
      assert.equal(expectedOutput[2], params[2]);
    });
  })
})
