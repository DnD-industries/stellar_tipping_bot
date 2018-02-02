const orm = require('orm')

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

  // Action.hasOne('sourceAccount', db.models.account, { reverse: 'sourceActions' })
  // Action.hasOne('targetAccount', db.models.account, { reverse: 'targetActions' })

  return SlackAuth
}