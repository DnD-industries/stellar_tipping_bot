

module.exports = {

  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Formats the number for use when displaying numbers to end users.
   * When working with Stellar we invariably work with numbers fixed to the seventh digit (that is, 1.12345678 is treated as 1.1234567)
   * In the event that we want to display a number like 1.0100000 to the user, instead we want to show them 1.01.
   * This function is what does that for us.
   *
   * @param number {number|string} Either a number or a parseable string representing a number ex: "1.01"
   * @returns {string} The string representation of the number as fit for end-user consumption.
   */
  formatNumber: (number) => {
    if(typeof number  === 'string') {
      number = parseFloat(number)
    }
    if (number % 1.0 != 0)
      return number.toString()
    else
      return parseInt(number).toString()
  },


  /**
   *
   * @param uniqueId {String} A unique ID for a user in the format of [teamid].[userid]
   */
  slackUserIdFromUniqueId: (uniqueId) => {
    return uniqueId.split(`:`)[1]
  },

  /**
   *
   * @param uniqueId {String} A unique ID for a user in the format of [teamid].[userid]
   */
  slackTeamIdFromUniqueId: (uniqueId) => {
    return uniqueId.split(`:`)[0]
  },


  /**
   * Creates a random unique ID.
   * Credit to https://stackoverflow.com/a/2117523
   * @returns {string} a unique UUID
   */
  uuidv4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}