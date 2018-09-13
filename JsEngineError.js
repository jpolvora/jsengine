/** @format */

const util = require('util')

function JsEngineError (message, innerError) {
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name
  this.message = message
  this.innerError = innerError
}

util.inherits(JsEngineError, Error)

module.exports = JsEngineError
