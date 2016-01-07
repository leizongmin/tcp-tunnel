'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const net = require('net');
const EventEmitter = require('events');
const utils = require('../lib/utils');
const debug = utils.debug('proxy');


class TCPTunnelClientProxy extends EventEmitter {

  /**
   * start server
   *
   * @param {Object} options
   *   - {Number} localPort
   *   - {Number} remotePort
   *   - {String} remoteHost
   */
  constructor(options) {
    super();

    options.localPort = Number(options.localPort);
    if (isNaN(options.localPort)) throw new Error(`invalid localPort: ${options.localPort}`);
    options.remotePort = Number(options.remotePort);
    if (isNaN(options.remotePort)) throw new Error(`invalid remotePort: ${options.remotePort}`);
    if (!options.remoteHost) throw new Error(`missing remoteHost`);

    this.local = net.connect(options.localPort, '127.0.0.1');
    this.remote = net.connect(options.remotePort, options.remoteHost);

    utils.pipeTwoWay(this.local, this.remote);

    const destroy = _ => {
      debug('destroy: localPort=%s, remotePort=%s', options.localPort, options.remotePort);
      this.local.destroy();
      this.remote.destroy();
    };

    this.local.once('error', err => {
      debug('connection{localPort=%s} error: error=%s', options.localPort, err);
      this.emit('error', err, this.local);
    });
    this.local.once('close', _ => {
      debug('connection{localPort=%s} close', options.localPort);
      this.emit('close', this.local);
      destroy();
    });

    this.remote.once('error', err => {
      debug('connection{remotePort=%s} error: error=%s', options.remotePort, err);
      this.emit('error', err, this.remote);
    });
    this.remote.once('close', _ => {
      debug('connection{localPort=%s} close', options.localPort);
      this.emit('close', this.remote);
      destroy();
    });

  }

}

module.exports = TCPTunnelClientProxy;
