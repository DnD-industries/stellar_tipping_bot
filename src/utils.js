

module.exports = {

  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  formatNumber: (number) => {
    if(typeof number  === 'string') {
      number = parseFloat(number)
    }
    if (number % 1.0 != 0)
      return number.toString()
    else
      return parseInt(number).toString()
  }

}