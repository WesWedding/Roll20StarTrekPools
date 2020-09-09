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
      '<div class="sheet-rolltemplate-strek">' +
        '<div class="sheet-rolltemplate-body">' +
          '<div class="sheet-dice">' +
            '<span style="color: #20bcff;">' + momentum.toString(10) + '</span>' +
            '<span style="color: #d71010; margin-left: 50px;">' + threat.toString(10) + '</span>' +
          '</div>' +
          '<div class="sheet-rolltemplate-header">' +
            '<div class="sheet-sectionheader"><span>Momentum / Threat</span></div>' +
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