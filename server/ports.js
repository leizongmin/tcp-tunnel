'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const net = require('net');
const EventEmitter = require('events');
const utils = require('../lib/utils');
const debug = utils.debug('server:ports');


class TCPTunnelServerPortManager extends EventEmitter {

  /**
   * port manager
   */
  constructor() {
    super();

    this._portsMap = new Map();
  }

  /**
   * create a server listen on a gvien port
   * if server is already exists, just return it
   *
   * @param {Number} port
   * @return {Object}
   */
  getPort(port) {
    port = Number(port);
    let s = this._portsMap.get(port);
    if (s) {
      debug('createPort: port=%s { already exists }', port);
      return s;
    } else {
      debug('createPort: port=%s { new }', port);
      s = net.createServer();
      s.listen(port);
      this._portsMap.set(port, s);
    }
  }

  /**
   * reset ports
   *
   * @param {Array} ports
   */
  reset(ports) {
    if (!Array.isArray(ports)) throw new Error(`invalid argument: ports`);

    // create new ports map
    const portsMap = new Map();
    for (const item of ports) {
      const p = this.getPort(item.port);
      portsMap.set(item.port, p);
    }

    // close old ports
    for (const p of this._portsMap.keys()) {
      if (!portsMap.has(p)) {
        // close the server
        debug('destroy port: %s', p);
        this._portsMap.get(p).destroy();
      }
    }

    this._portsMap.clear();
    this._portsMap = portsMap;
  }

}

module.exports = TCPTunnelServerPortManager;
