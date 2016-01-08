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

      s.on('connection', c => {
        debug('new connection: port=%s, remote { host=%s, port=%s }', port, c.remoteAddress, c.remotePort);
        this.emit('connection', port, c, s);
        c.once('close', _ => {
          debug('connection close: port=%s, remote { host=%s, port=%s }', port, c.remoteAddress, c.remotePort);
        });
      });

      s.on('error', err => {
        debug('port error: port=%s, error=%s', port, err);
        this.emit('port error', port, s, err);
      });

      s.on('close', _ => {
        debug('port close: port=%s', port);
        this.emit('port close', port, s);
      });

    }
  }

  /**
   * reset ports
   *
   * @param {Array} ports format: [5001, 5002]
   */
  reset(ports) {
    if (!Array.isArray(ports)) throw new Error(`invalid argument: ports`);

    // create new ports map
    const portsMap = new Map();
    for (const port of ports) {
      portsMap.set(port, this.getPort(port));
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
