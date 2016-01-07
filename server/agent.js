'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const net = require('net');
const EventEmitter = require('events');
const utils = require('../lib/utils');
const debug = utils.debug('server:agent');


class TCPTunnelServerAgent extends EventEmitter {

  /**
   * port agent
   */
  constructor() {
    super();

    this._sessions = new Map();

    this._server = net.createServer();
    this._server.listen(0);
  }

  add(sid, conn) {
    debug('add: sid=%s, client { host=%s, port=%s }', sid, conn.remoteAddress, conn.remotePort);
  }

  getListenPort() {
    return this._server.address().port;
  }

}

module.exports = TCPTunnelServerAgent;
