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


    // connect to local port first
    this.local = net.connect(options.localPort, '127.0.0.1', _ => {
      debug('connection{localPort=%s} connected', options.localPort);
      this.local.isConnected = true;
      this.emit('local connect', this.local);

      // next, connect to remote port
      this.remote = net.connect(options.remotePort, options.remoteHost, _ => {
        debug('connection{remotePort=%s} connected', options.remotePort);
        this.remote.isConnected = true;
        this.emit('remote connect', this.remote);
      });

      bind();
    });

    this._destroyEmitted = false;
    const destroy = _ => {
      debug('destroy: localPort=%s, remotePort=%s', options.localPort, options.remotePort);
      this.local.destroy();
      if (this.remote) {
        this.remote.destroy();
      }
      if (!this._destroyEmitted) {
        this._destroyEmitted = true;
        this.emit('destroy');
      }
    };

    const bind = _ => {

      utils.pipeTwoWay(this.local, this.remote);

      this.remote.once('error', err => {
        debug('connection{remotePort=%s} error: error=%s', options.remotePort, err);
        this.emit('remote error', err, this.remote);
        destroy();
      });
      this.remote.once('close', _ => {
        debug('connection{localPort=%s} close', options.localPort);
        this.emit('remote close', this.remote);
        destroy();
      });

    };

    this.local.once('error', err => {
      debug('connection{localPort=%s} error: error=%s', options.localPort, err);
      this.emit('local error', err, this.local);
      destroy();
    });
    this.local.once('close', _ => {
      debug('connection{localPort=%s} close', options.localPort);
      this.emit('local close', this.local);
      destroy();
    });

  }

}

module.exports = TCPTunnelClientProxy;
