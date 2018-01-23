

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
  }, 

  //Credit to https://stackoverflow.com/a/2117523
  uuidv4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}