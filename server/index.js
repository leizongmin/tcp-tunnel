'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const socket = require('clouds-socket');
const utils = require('../lib/utils');


class TCPTunnelServer {

  /**
   * start server
   *
   * @param {Object} options
   *   - {String} host
   *   - {Number} port
   *   - {Object} clients
   */
  constructor(options) {

    options = options || {};

    if (!options.clients) throw new Error(`missing config: clients`);
    this._clientsPassword = new Map();
    for (const n in options.clients) {
      this._clientsPassword.set(n, options.clients[n]);
    }

    options.port = Number(options.port);
    if (isNaN(port)) throw new Error(`invalid port: ${options.port}`);

    options.host = options.host || '';

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
        } else {

          // other message

        }
      });

    });

  }

}

utils.inheritsEventEmitter(TCPTunnelServer);

module.exports = TCPTunnelServer;
