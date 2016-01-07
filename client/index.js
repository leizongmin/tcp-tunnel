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

    this._server.on('connect', _ => {
      debug('connected');
      // send handshake
      this._server.send(utils.signJSON(options.password, {
        name: options.name,
        message: 'hey guy!',
      }));
    });

    this._server.on('data', d => {

      d = utils.tryParseJSON(d);
      if (!d) return debug('invalid data from server: wrong format');
      if (!utils.verifySign(options.password, d)) return debug('invalid data from server: verify data sign failed');

      if (d.message) {
        debug('server message: %s', d.message);
        this.emit('server message', d.message, d);
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

    debug('created: server { host=%s, port=%s } client { name=%s, password=%s }',
      options.host, options.port, options.name, options.password);
  }

  /**
   * exit
   */
  exit(callback) {
    this._server.exit(callback);
  }

}

module.exports = TCPTunnelClient;
