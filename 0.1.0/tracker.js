var STAPoolTracker = STAPoolTracker || (function () {
  'use strict'

  const STATE_NAME = 'STAPools'
  const SCRIPT_NAME = 'Star Trek Pools'

  // Styles largely cribbed from the roll template of the Roll20 Star Trek
  // Adventures character sheet.  Grabbed Sept 2020.
  const STYLES = {
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
      'line-height: 1;' +
      'padding: 0px 5px 0px 5px; ' +
      'vertical-align: top;'
  }

  const CMD = {
    MOMENTUM: '!momentum',
    THREAT: '!threat',
  }

  const POOLS = {
    MOMENTUM: 'momentum',
    THREAT: 'threat',
  }

  let _handout = null

  function init () {
    if (!_.has(state, STATE_NAME)) {
      state[STATE_NAME] = {
        threat: 0,
        momentum: 0,
      }
    }

    if (!_handout) {
      _handout = _getOrCreateHandout()
      sendChat(SCRIPT_NAME, '"Momentum and Threat Pools" handout is available!  Check it to keep an eye on Momentum and Threat!')
    }
    _handout.set('notes', _buildPoolHtml())

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

  function _getOrCreateHandout () {
    let handout = findObjs({
      type: "handout",
      name: "Momentum and Threat Pools"
    })[0];
    if (!handout) {
      handout = createObj("handout",{
        name: "Momentum and Threat Pools"
      });
    }
    return handout;
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
        _modifyPool(playerid, POOLS.MOMENTUM, arg0,arg1)
        _chatPools()
        _handout.set('notes', _buildPoolHtml())
        break
      case CMD.THREAT:
        _modifyPool(playerid, POOLS.THREAT, arg0, arg1)
        _chatPools()
        _handout.set('notes', _buildPoolHtml())
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
    }

    if (arg0 === 'set') {
      const value = parseInt(arg1)

      if (!arg1) {
        _reportError(playerId, 'Missing value to set ' + poolName +' to.')
        return
      }
      if (!_.isNumber(value)) {
        _reportError(playerId, 'Invalid value for ' + poolName + ' (Not a number!)')
        return
      }

      pools[poolName] = value
    }
  }

  function _chatPools() {
    const html = _buildPoolHtml()
    sendChat(SCRIPT_NAME, html)
  }

  function _buildPoolHtml() {
    const momentum = state[STATE_NAME][POOLS.MOMENTUM]
    const threat = state[STATE_NAME][POOLS.THREAT]

    return '' +
      '<div style="' + STYLES.base + '">' +
        '<div style="' + STYLES.body + '">' +
          '<div style="' + STYLES.quantity + '">' +
            '<span style="' + STYLES.quantMomentum + '">' + momentum.toString(10) + '</span>' +
            '<span style="' + STYLES.quantThreat + '">' + threat.toString(10) + '</span>' +
          '</div>' +
          '<div style="' + STYLES.header + '">' +
            '<div style="' + STYLES.sectionHead + '"><span style="' + STYLES.headSpan + '">Momentum / Threat</span></div>' +
          '</div>' +
        '</div>' +
      '</div>'
  }

  function setMomentum(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME][POOLS.MOMENTUM] = val
  }

  function setThreat(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME][POOLS.THREAT] = val
  }

  function modMomentum(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME][POOLS.MOMENTUM] += val
  }
  function modThreat(val) {
    if (!_.isNumber(val)) return
    state[STATE_NAME][POOLS.THREAT] += val
  }
  function _reportError(playerid, msg) {
    const player = getObj('player', playerid)
    if (player) {
      const name = player.get('displayname')
      sendChat(SCRIPT_NAME, '/w "' + name + '" ' + msg)
    } else {
      sendChat(SCRIPT_NAME, msg)
    }
  }

  function resetPools() {
    state[STATE_NAME] = {
      threat: 0,
      momentum: 0,
    }
    _chatPools()
    _handout.set('notes', _buildPoolHtml())
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