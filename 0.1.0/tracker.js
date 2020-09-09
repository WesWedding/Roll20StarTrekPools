
// Styles largely cribbed from the roll template of the Roll20 Star Trek
// Adventures character sheet.  Grabbed Sept 2020.
const style = {
  base: 'background-color: rgb(0,19,35); ' +
    'background-repeat: no-repeat; ' +
    'border-radius: 15px 15px 15px 15px; ' +
    'border-spacing: 0; ' +
    'color: rgb(163,64,113); ' +
    'font-size: 1.5em; ' +
    'font-weight: bold; ' +
    'padding: 2px; ' +
    'width: 230px;',
  body: 'border: none; ' +
    'color: rgb(195,188,222); ' +
    'font-size: 1em; ' +
    'margin: 5px 5px 5px 5px; ' +
    'text-align: center;',
  quantity: 'display: inline-block; ' +
    'padding: 5px 5px 0px 5px;',
  quantMomentum: 'color: #20bcff;',
  quantThreat: 'color: #d71010; margin-left: 50px;',
  header: 'padding: 8px 0px 8px 0px;' +
    'font-size: 2em;',
  sectionHead: 'background-color: rgb(245,157,8); ' +
    'border-radius: 2em; ' +
    'display: block; ' +
    'height: 15px; ' +
    'letter-spacing: 1px; ' +
    'text-transform: uppercase;',
  headSpan: 'background: rgb(0,19,35); ' +
    'color: rgb(163,64,113); ' +
    'font-size: 15px; ' +
    'padding: 0px 5px 0px 5px; ' +
    'vertical-align: top;'
}

var STAPoolTracker = STAPoolTracker || (function () {
  'use strict'

  const CMD = {
    MOMENTUM: '!momentum',
    THREAT: '!threat',
  }
  const STATE_NAME = 'STAPools'

  function init () {
    if (!_.has(state, STATE_NAME)) {
      state[STATE_NAME] = {
        threat: 0,
        momentum: 0,
      }
    }

    on('chat:message', (msg) => {
      if (msg.type !== 'api') return

      const found = _.find(CMD, (cmd) => {
        return msg.content.indexOf(cmd) === 0
      })
      if (!found) return
      const args = msg.content.split(' ').slice(1)
      _handleCmd(msg.playerid, found, args)
    })
  }

  function _handleCmd(playerid, command, args) {
    if (args.length === 0) {
      _chatPools()
      return
    }

    const arg0 = args[0]

    if (args[0] === 'reset') {
      resetPools()
      return
    }

    const arg1 = args.length >= 2 ? args[1] : null

    switch (command) {
      case CMD.MOMENTUM:
        _modifyPool(playerid, 'momentum', arg0,arg1)
        break
      case CMD.THREAT:
        _modifyPool(playerid, 'threat', arg0, arg1)
        break
      default:
        // Do nothing.
        break
    }
  }

  function _modifyPool(playerId, poolName, arg0, arg1) {
    const pools = state[STATE_NAME]
    if (!pools[poolName] && pools[poolName] !== 0 ) return

    if (arg0 === 'add' || arg0 === 'sub') {
      if (!arg1) {
        _reportError(playerId, 'Missing value to add/subtract from ' + poolName)
        return
      }

      const value = parseInt(arg1)
      if (!_.isNumber(value)) {
        _reportError(playerId, 'Invalid value (Not a number!)')
        return
      }
      if (arg0 === 'add') {
        pools[poolName] += value
      } else {
        pools[poolName] -= value
      }
      _chatPools()
    }

    if (arg0 === 'set') {
      const value = parseInt(arg1)

      if (!arg1) {
        _reportError(playerId, 'Missing value to set momentum to.')
        return
      }
      if (!_.isNumber(value)) {
        _reportError(playerId, 'Invalid value (Not a number!)')
        return
      }

      pools[poolName] = value
      _chatPools()
    }
  }

  function _chatPools() {
    const html = _buildPoolHtml()
    sendChat('Pools', html)
  }

  function _buildPoolHtml() {
    const momentum = state[STATE_NAME].momentum
    const threat = state[STATE_NAME].threat

    return '' +
      '<div style="' + style.base + '">' +
        '<div style="' + style.body + '">' +
          '<div style="' + style.quantity + '">' +
            '<span style="' + style.quantMomentum + '">' + momentum.toString(10) + '</span>' +
            '<span style="' + style.quantThreat + '">' + threat.toString(10) + '</span>' +
          '</div>' +
          '<div style="' + style.header + '">' +
            '<div style="' + style.sectionHead + '"><span style="' + style.headSpan + '">Momentum / Threat</span></div>' +
          '</div>' +
        '</div>' +
      '</div>'
  }

  function setMomentum(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME].momentum = val
  }

  function setThreat(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME].momentum = val
  }

  function modMomentum(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME].momentum += val
  }
  function modThreat(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME].momentum += val
  }
  function _reportError(playerid, msg) {
    const player = getObj('player', playerid)
    if (player) {
      const name = player.get('displayname')
      sendChat('STA Pool', '/w "' + name + '" ' + msg)
    } else {
      sendChat('STA Pool', msg)
    }
  }

  function resetPools() {
    state[STATE_NAME] = {
      threat: 0,
      momentum: 0,
    }
    _chatPools()
  }

  return {
    init: init,
    reset: resetPools,
    modMomentum: modMomentum,
    setMomentum: setMomentum,
    modThreat: modThreat,
    setThreat: setThreat,
  }
}())

on('ready', function() {
  'use strict'
  log('pool tracker ready')
  STAPoolTracker.init()
})