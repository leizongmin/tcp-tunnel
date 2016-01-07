'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events');
const socket = require('clouds-socket');
const utils = require('../lib/utils');
const debug = utils.debug('server');
const TCPTunnelServerAgent = require('./agent');
const TCPTunnelServerPortManager = require('./ports');


class TCPTunnelServer extends EventEmitter {

  /**
   * start server
   *
   * @param {Object} options
   *   - {String} host, defaults to 0.0.0.0
   *   - {Number} port, required
   *   - {Object} clients, format: {name1: password1, name2: password2}
   *   - {Object} ports, format: [{port: server_port, client: {name: clientName, port: clientPort}}, ...]
   */
  constructor(options) {
    super();

    this._options = options = options || {};

    // clients
    if (!options.clients) throw new Error(`missing config: clients`);
    this._clientsPassword = new Map();
    for (const n in options.clients) {
      this._clientsPassword.set(n, options.clients[n]);
    }

    //--------------------------------------------------------------------------

    // ports
    if (!Array.isArray(options.ports)) throw new Error(`missing config: ports`);
    this._clientsInfodPortMap = new Map();
    options.ports.forEach(item => this._clientsInfodPortMap.set(item.port, item.client));
    // ports agent
    this._agent = new TCPTunnelServerAgent();
    // ports manager
    this._ports = new TCPTunnelServerPortManager();
    this._ports.reset(options.ports.map(item => item.port));

    this._ports.on('connection', (port, conn, server) => {

      // lookup the client
      const client = this.lookupClientByPort(port);
      if (!client) {
        debug('connection{port=%s}: close { no client online }', port);
        conn.destroy();
        return;
      }
      debug('connection{port=%s}: client=%s', port, client.name);

      // add to session agent
      const sid = utils.generateSessionId();
      this._agent.add(sid, client.password, conn);

      // tell client to connect to agent server
      const info = this.lookupClientInfoByPort(port);
      client.send(utils.signJSON(client.password, {
        type: 'new_session',
        session: sid,
        localPort: info.port,
        remotePort: this._agent.getListenPort(),
      }));

    });

    //--------------------------------------------------------------------------

    options.port = Number(options.port);
    if (isNaN(options.port)) throw new Error(`invalid port: ${options.port}`);

    options.host = options.host || '0.0.0.0';

    this._server = socket.createServer({
      host: options.host,
      port: options.port,
    });
    this._server.on('error', err => {
      debug('server event: error { %s }', err);
      this.emit('error', err);
    });
    this._server.on('listening', _ => {
      debug('server event: listening');
      this.emit('listening');
    });
    this._server.on('exit', _ => {
      debug('server exit');
      this.emit('exit');
    });

    this._clients = new Map();
    this._tmpClients = new Map();
    this._server.on('connection', c => {
      debug('client{id=%s}: new connection', c.id);

      c.isVerified = false;
      this._tmpClients.set(c.id, c);
      this.emit('new connection', c);

      c.once('exit', _ => {
        debug('client{id=%s} event: exit', c.id);
        this._clients.delete(c.name);
        this._tmpClients.delete(c.id);
        this.emit('client disconnected', c);
      });

      c.on('error', err => {
        debug('client{id=%s} event: error { %s }', c.id, err);
        this.emit('client error', err, c);
      });

      const disconnect = reason => {
        debug('client{id=%s} disconnect: name=%s, reason=%s', c.id, c.name, reason);
        c.exit();
      };

      c.on('data', d => {

        d = utils.tryParseJSON(d);
        if (!d) return disconnect('wrong JSON data format');

        // verify sign, if verify failed then disconnect
        const p = this._clientsPassword.get(c.name || d.name);
        if (!utils.verifySign(p, d)) return disconnect('very data sign failed');

        if (!c.isVerified) {

          // handshake: {name: 'client name'}
          c.isVerified = true;
          c.name = d.name;
          c.password = p;
          this._tmpClients.delete(c.id);
          this._clients.set(c.name, c);
          c.send(utils.signJSON(c.password, {
            type: 'message',
            message: 'connected! good job',
          }));
          this.emit('client connected', c);
          debug('client{id=%s} verified: name=%s, message=%s', c.name, d.message);

        } else {

          if (d.message) {
            debug('client{id=%s} message: %s', c.id, d.message);
            this.emit('client message', c, d.message, d);
            return;
          }

          // other message
          console.log(d);

        }
      });

    });

    //--------------------------------------------------------------------------
    debug('created: server { host=%s, port=%s }', options.host, options.port);
  }

  lookupClientByName(name) {
    return this._clients.get(name) || false;
  }

  lookupClientByPort(port) {
    return this.lookupClientByName(this.lookupClientNameByPort(port));
  }

  lookupClientNameByPort(port) {
    const c = this._clientsInfodPortMap.get(port);
    return (c && c.name) || false;
  }

  lookupClientInfoByPort(port) {
    return this._clientsInfodPortMap.get(port) || false;
  }

  /**
   * exit
   */
  exit(callback) {
    this._server.exit(callback);
  }

}

module.exports = TCPTunnelServer;
