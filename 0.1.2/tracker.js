/**
 * Provides methods to track and modify Threat and Momentum Pools for Star Trek Adventures.
 *
 * !threat [add/sub/set] [number]
 * !momentum [add/sub/set] [number]
 *
 * For example: To remove some Momentum, a player would type "!momentum sub 2"
 *
 * You can also silently check the pools by using !threat or !momentum without any arguments.
 * To remind everyone what the pools currently look like, use:
 * ![threat/momentum] show
 *
 * For convenience, players may use !t or !m instead of the full word.
 */

var STAPoolTracker = STAPoolTracker || (function () {
  'use strict'

  const STATE_NAME = 'STAPools'
  const SCRIPT_NAME = 'Star Trek Pools'

  // Styles largely cribbed from the roll template of the Roll20 Star Trek
  // Adventures character sheet.  Grabbed Sept 2020.
  const COLORS = {
    MOMENTUM: "#20bcff",
    THREAT: "#d71010",
  }
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
    quantMomentum: `color: ${COLORS.MOMENTUM};`,
    quantThreat: `color: ${COLORS.THREAT}; margin-left: 50px;`,
    inlineQuantMomentum: `font-weight: bold; color: ${COLORS.MOMENTUM};`,
    inlineQuantThreat: `font-weight: bold; color: ${COLORS.THREAT};`,
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
    M: '!m',
    THREAT: '!threat',
    T: '!t',
  }

  const ACTION = {
    ADD: 'add',
    SUB: 'sub',
    SET: 'set',
    SHOW: 'show',
    EMPTY: 'empty',
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
    const player = getObj('player', playerid)
    if (args.length === 0) {
      _chatPools(player)
      return
    }

    const arg0 = args[0]

    if (args[0] === ACTION.SHOW) {
      _chatActionTaken(player, args[0])
      _chatPools()
      return
    }

    if (args[0] === ACTION.EMPTY) {
      _chatActionTaken(player, args[0])
      emptyPools()
      return
    }

    const arg1 = args.length >= 2 ? args[1] : null

    let res = false
    switch (command) {
      case CMD.MOMENTUM:
      case CMD.M:
        res = _modifyPool(player, POOLS.MOMENTUM, arg0,arg1)
        if (!res) return
        _chatActionTaken(player, args[0], POOLS.MOMENTUM, arg1)
        _chatPools()
        _handout.set('notes', _buildPoolHtml())
        break
      case CMD.THREAT:
      case CMD.T:
        res = _modifyPool(player, POOLS.THREAT, arg0, arg1)
        if (!res) return
        _chatActionTaken(player, args[0], POOLS.THREAT, arg1)
        _chatPools()
        _handout.set('notes', _buildPoolHtml())
        break
      default:
        // Do nothing.
        break
    }
  }

  function _modifyPool(player, poolName, arg0, arg1) {
    const pools = state[STATE_NAME]
    if (!pools[poolName] && pools[poolName] !== 0 ) return

    if (arg0 === ACTION.ADD || arg0 === ACTION.SUB) {
      if (!arg1) {
        _reportError(player, 'Missing value to add/subtract from ' + poolName)
        return false
      }

      const value = isNaN(arg1) ? Infinity : parseInt(arg1)
      if (!(_.isNumber(value) && _.isFinite(value))) {
        _reportError(player, 'Invalid value (Not a number!)')
        return false
      }
      if (arg0 === ACTION.ADD) {
        pools[poolName] += value
      } else {
        pools[poolName] -= value
      }
    }

    if (arg0 === ACTION.SET) {
      if (!arg1) {
        _reportError(player, 'Missing value to set ' + poolName +' to.')
        return false
      }

      const value = isNaN(arg1) ? Infinity : parseInt(arg1)
      if (!(_.isNumber(value) && _.isFinite(value))) {
        _reportError(player, 'Invalid value for ' + poolName + ' (Not a number!)')
        return false
      }

      pools[poolName] = value
    }

    return true
  }

  function _chatActionTaken(activePlayer, action, poolName, arg1) {
    let actionText = ""
    let playerId = activePlayer.get("_id")
    let playerName = activePlayer.get("_displayname")

    let poolString = poolName ? _formatPoolName(poolName) : ""

    switch (action) {
      case ACTION.SHOW:
        actionText = "Showing pools."
        break
      case ACTION.ADD:
        actionText = `${playerName} adds <b>${arg1}</b> to ${poolString}`
        break
      case ACTION.SUB:
        actionText = `${playerName} removes <b>${arg1}</b> from ${poolString}`
        break
      case ACTION.SET:
        actionText = `${playerName} sets ${poolString} to <b>${arg1}</b>`
        break
      case ACTION.EMPTY:
        actionText = `${playerName} empties/resets the threat and momentum pools.`
        break
    }

    sendChat("player|" + playerId, actionText)
  }

  function _formatPoolName(poolName) {
    switch (poolName) {
      case POOLS.MOMENTUM:
        return `<span style="${STYLES.inlineQuantMomentum}">Momentum</span>`
      case POOLS.THREAT:
        return `<span style="${STYLES.inlineQuantThreat}">Threat</span>`
      default:
        return "<b>????</b>"
    }
  }

  function _chatPools(target) {
    const html = _buildPoolHtml()
    if (!target) {
      sendChat(SCRIPT_NAME, html)
      return
    }
    log (target)

    sendChat(SCRIPT_NAME, '/w "' + target.get("displayname") + '" ' + html)
  }

  function _buildPoolHtml() {
    const momentum = state[STATE_NAME][POOLS.MOMENTUM]
    const threat = state[STATE_NAME][POOLS.THREAT]

    // Let's not have everything explode if logic breaks somewhere...
    const momentumStr = _.isNumber(momentum) ? momentum.toString(10) : '??'
    const threatStr = _.isNumber(threat) ? threat.toString(10) : '??'

    return '' +
      '<div style="' + STYLES.base + '">' +
      '<div style="' + STYLES.body + '">' +
      '<div style="' + STYLES.quantity + '">' +
      '<span style="' + STYLES.quantMomentum + '">' + momentumStr + '</span>' +
      '<span style="' + STYLES.quantThreat + '">' + threatStr + '</span>' +
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
  function _reportError(player, msg) {
    if (player) {
      const name = player.get('displayname')
      sendChat(SCRIPT_NAME, '/w "' + name + '" ' + msg)
    } else {
      sendChat(SCRIPT_NAME, msg)
    }
  }

  function emptyPools() {
    state[STATE_NAME] = {
      threat: 0,
      momentum: 0,
    }
    _chatPools()
    _handout.set('notes', _buildPoolHtml())
  }

  return {
    init: init,
    empty: emptyPools,
    modMomentum: modMomentum,
    setMomentum: setMomentum,
    modThreat: modThreat,
    setThreat: setThreat,
  }
}())

on('ready', function() {
  'use strict'
  STAPoolTracker.init()
})