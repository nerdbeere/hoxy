/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Proxy = require('./lib/proxy')

module.exports = {
  Proxy: Proxy,
  createServer: function(opts) {
    return new Proxy(opts)
  },
  forever: function(handler, ctx) {
    console.error('warning: the forever() function is deprecated and will go away in a future release')
    process.on('uncaughtException', function(err) {
      if (handler === undefined) {
        console.log(err.stack)
      } else if (typeof handler === 'function') {
        handler.call(ctx, err)
      } else if (typeof handler.write === 'function') {
        handler.write(err.stack)
      } else {
        console.log(err.stack)
      }
    })
  },
}
