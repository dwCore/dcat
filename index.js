var ddatabase = require('ddatabase')
var ddrive = require('ddrive/lib/messages.js')
var dWebChannel = require('@dwcore/channel')
var dWebFlockPresets = require('@flockcore/presets')
var dwrem = require('@dwcore/rem')
var dws2 = require('@dwcore/dws2')
var DWSD = require('@dwcore/dwsd')
var flockRevelation = require('@flockcore/revelation')
var tree = require('append-tree/messages.js')

module.exports = function (key) {
  var dwsd = DWSD.obj()
  var ddb = ddatabase(function (filename) {
    return dwrem()
  }, key)

  var flockOpts = {
    hash: false,
    stream: function (opts) {
      opts.live = true
      return ddb.replicate(opts)
    }
  }

  var sw = flockRevelation(dWebFlockPresets(flockOpts))
  sw.listen()

  ddb.on('ready', function () {
    sw.join(ddb.revelationKey)
    ddb.update(function () {
      var first = true
      var isDistributedDrive = false
      var stream = ddb.createReadStream()
      var decode = dws2.obj(function (obj, enc, next) {
        if (first) {
          first = false
          try {
            var idx = ddrive.Index.decode(obj)
          } catch (e) {
            return next(null, obj)
          }
          if (idx.type === '@ddrive/core') {
            isDistributedDrive = true
            return next(null, idx)
          } else {
            return next(null, obj)
          }
        }
        if (isDistributedDrive) {
          var node = tree.Node.decode(obj)
          node.value = ddrive.Stat.decode(node.value)
          return next(null, node)
        }
        return next(null, obj)
      })
      dWebChannel(stream, decode)
      dwsd.setReadable(decode)
    })
  })
  dwsd.close = function () {
    sw.close()
    ddb.close()
  }
  return dwsd
}
