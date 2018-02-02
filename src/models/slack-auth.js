const orm = require('orm')

var singleton;

module.exports = (db) => {

  /**
   * Storage and representation of an oauth token that has been given to us
   */
  const SlackAuth = db.define('slackauth', {
    team: String,
    token: String,
    createdAt: String
  }, {
    validations : {
      team: orm.enforce.required('Team is required.'),
      token: orm.enforce.required('Token is required.'),
      createdAt: orm.enforce.required('createdAt is required.')
    },
    hooks: {
      beforeSave: function () {
        const now = new Date()
        if (!this.createdAt) {
          this.createdAt = now.toISOString()
        }
      }
    }
  })

  /**
   *
   * @param team {String} The Slack TeamID of a given team. This is likely derived from the uniqueID of a user making a POST request to our server where the unique ID is "[teamID].[userID]"
   * @returns {String|null} A viable auth token for the given team
   */
  SlackAuth.authTokenForTeamId = async function (team) {
    return await SlackAuth.withinTransaction(async () => {
      let auth = await SlackAuth.oneAsync({team});
      if (auth) {
        return auth.token;
      } else {
        return null;
      }
    })
  }

  singleton = SlackAuth;
  return singleton;
}

module.exports.Singleton = () => {
  return singleton;
}
