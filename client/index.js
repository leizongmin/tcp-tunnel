'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events');
const socket = require('clouds-socket');
const utils = require('../lib/utils');
const debug = utils.debug('client');
const TCPTunnelClientProxy = require('./proxy');


class TCPTunnelClient extends EventEmitter {

  /**
   * start server
   *
   * @param {Object} options
   *   - {String} host, defaults to 0.0.0.0
   *   - {Number} port, required
   *   - {String} name
   *   - {String} password
   *   - {Number} heartbeat
   */
  constructor(options) {
    super();

    this._options = options = options || {};

    options.heartbeat = Number(options.heartbeat);
    if (isNaN(options.heartbeat)) options.heartbeat = 10000;

    if (!options.host) throw new Error(`missing host`);
    options.port = Number(options.port);
    if (isNaN(options.port)) throw new Error(`invalid port: ${options.port}`);

    if (!options.name) throw new Error(`missing name`);
    if (!options.password) throw new Error(`missing password`);

    this._server = socket.createClient({
      host: options.host,
      port: options.port,
    });
    this._server.on('error', err => {
      debug('server event: error { %s }', err);
      this.emit('error', err);
    });
    this._server.on('exit', _ => {
      debug('server event: exit');
      this.emit('exit');
    });

    this._retryConnecting = 0;
    this._server.on('connect', _ => {
      debug('connected');

      // if verify sign fail, don't reconnect
      this._retryConnecting++;
      if (this._retryConnecting >= 2 && !this._server.isVerified) {
        debug('server verify failed');
        this.emit('server verify failed');
        this._server.exit();
        return;
      }

      // send handshake
      this._server.isVerified = false;
      this._server.send(utils.signJSON(options.password, {
        method: 'verify',
        name: options.name,
        message: 'hey guy!',
      }));
    });

    this._server.on('data', d => {

      d = utils.tryParseJSON(d);
      if (!d) return debug('invalid data from server: wrong format');
      if (!utils.verifySign(options.password, d)) return debug('invalid data from server: verify data sign failed');

      if (!this._server.isVerified) {
        this._server.isVerified = true;
        this.emit('server verified');
      }

      if (d.method === 'message') {
        debug('server message: %s', d.message);
        this.emit('server message', d.message, d);
        return;
      }

      if (d.method === 'new_session') {
        debug('new session: session=%s, localPort=%s, remotePort=%s', d.session, d.localPort, d.remotePort);

        // setup proxy
        const proxy = new TCPTunnelClientProxy({
          localPort: d.localPort,
          remotePort: d.remotePort,
          remoteHost: options.host,
        });

        proxy.once('remote connect', _ => {
          proxy.remote.write(utils.signJSON(options.password, {
            method: 'connected',
            session: d.session,
          }));
        });

        proxy.once('local close', local => {
          if (local.isConnected) return;
          this._server.send(utils.signJSON(options.password, {
            method: 'close_session',
            session: d.session,
            message: `cannot connect to local port ${d.localPort}`,
          }));
        });

        return;
      }

      console.log(d);

    });

    this._pingInfo = {delay: null, timestamp: null};
    const pingServer = _ => {
      debug('ping: send request');
      this._server.ping((err, delay, timestamp) => {
        debug('ping: result { delay=%s, timestamp=%s }', delay, timestamp);
        this._pingInfo.delay = delay;
        this._pingInfo.timestamp = timestamp;
      });
    };
    this._heartbeatTid = setInterval(pingServer, options.heartbeat);
    this._server.once('connect', pingServer);
    this._server.on('exit', _ => {
      clearInterval(this._heartbeatTid);
    });

    debug('created: server { host=%s, port=%s } client { name=%s, password=%s }',
      options.host, options.port, options.name, options.password);
  }

  /**
   * exit
   *
   * @param {Function} callback
   */
  exit(callback) {
    this._server.exit(callback);
  }

}

module.exports = TCPTunnelClient;
