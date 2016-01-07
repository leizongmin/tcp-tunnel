'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events');
const socket = require('clouds-socket');
const utils = require('../lib/utils');


class TCPTunnelServer extends EventEmitter {

  /**
   * start server
   *
   * @param {Object} options
   *   - {String} host, defaults to 0.0.0.0
   *   - {Number} port, required
   *   - {Object} clients, format: {name1: password1, name2: password2}
   */
  constructor(options) {
    super();

    options = options || {};

    if (!options.clients) throw new Error(`missing config: clients`);
    this._clientsPassword = new Map();
    for (const n in options.clients) {
      this._clientsPassword.set(n, options.clients[n]);
    }

    options.port = Number(options.port);
    if (isNaN(options.port)) throw new Error(`invalid port: ${options.port}`);

    options.host = options.host || '0.0.0.0';

    this._server = socket.createServer({
      host: options.host,
      port: options.port,
    });
    this._server.on('error', err => {
      this.emit('error', err);
    });
    this._server.on('listening', _ => {
      this.emit('listening');
    });

    this._clients = new Map();
    this._tmpClients = new Map();
    this._server.on('connection', c => {

      c.isVerified = false;
      this._tmpClients.set(c.id, c);
      this.emit('new connection', c);

      c.once('exit', _ => {
        this._clients.delete(c.name);
        this._tmpClients.delete(c.id);
        this.emit('client disconnected', c);
      });

      c.on('error', err => {
        this.emit('client error', err, c);
      });

      c.on('data', d => {

        d = utils.tryParseJSON(d);
        if (!d) return c.exit();

        // verify sign, if verify failed then disconnect
        const p = this._clientsPassword.get(c.name || d.name);
        if (!utils.verifySign(p, d)) return c.exit();

        if (!c.isVerified) {

          // handshake: {name: 'client name'}
          c.isVerified = true;
          c.name = d.name;
          this._tmpClients.delete(c.id);
          this._clients.set(c.name, c);
          c.send(utils.sign(p, {message: 'connected! good job'}));
          this.emit('client connected', c);

        } else {

          // other message

        }
      });

    });

  }

  /**
   * exit
   */
  exit(callback) {
    this._server.exit(callback);
  }

}

module.exports = TCPTunnelServer;
