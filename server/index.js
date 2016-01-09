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
   *   - {Object} listenPorts, format: [{port: server_port, client: {name: clientName, port: clientPort}}, ...]
   */
  constructor(options) {
    super();

    this._options = options = options || {};

    // clients
    if (!options.clients) throw new Error(`missing config: clients`);
    this.setClientsPassword(options.clients);

    //--------------------------------------------------------------------------

    // ports
    if (!Array.isArray(options.listenPorts)) throw new Error(`missing config: ports`);
    this.setListenPorts(options.listenPorts);

    // ports agent
    this._agent = new TCPTunnelServerAgent();
    this._agent.on('new connection', c => {
      this.emit('agent new connection', c);
    });
    this._agent.on('connection close', c => {
      this.emit('agent connection close', c);
    });
    this._agent.on('pipe connection', (c, s) => {
      this.emit('agent pipe connection', c, s);
    });

    // ports manager
    this._ports = new TCPTunnelServerPortManager();
    this._ports.reset(options.listenPorts.map(item => item.port));
    this._ports.on('port error', (port, s, err) => {
      this.emit('port error', port, s, err);
    });
    this._ports.on('port close', (port, s) => {
      this.emit('port close', port, s);
    });
    this._ports.on('connection', (port, conn, server) => {

      // lookup the client
      const client = this.lookupClientByPort(port);
      if (!client) {
        debug('connection{port=%s}: close { no client online }', port);
        conn.destroy();
        return;
      }
      debug('connection{port=%s}: client=%s', port, client.name);

      this.emit('port new connection', port, server, client, conn);

      // add to session agent
      const sid = utils.generateSessionId();
      this._agent.add(sid, client.name, client.password, conn);

      // tell client to connect to agent server
      const info = this.lookupClientInfoByPort(port);
      client.send(utils.signJSON(client.password, {
        method: 'new_session',
        session: sid,
        localPort: info.port,
        remotePort: this._agent.getListenPort(),
      }));

      conn.once('close', _ => {
        debug('connection{port=%s} close: client=%s', port, client.name);
      });

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
        if (this._clients.has(c.name) && this._clients.get(c.name).id === c.id) {
          this._clients.delete(c.name);
        }
        if (this._tmpClients.has(c.id)) this._tmpClients.delete(c.id);
        this._agent.removeAllByClientName(c.name);
        this.emit('client disconnected', c);
      });

      c.on('error', err => {
        debug('client{id=%s} event: error { %s }', c.id, err);
        this.emit('client error', c, err);
      });

      const disconnect = reason => {
        process.nextTick(_ => {
          debug('client{id=%s} disconnect: name=%s, reason=%s', c.id, c.name, reason);
          c.exit();
        });
      };

      c.on('data', d => {

        d = utils.tryParseJSON(d);
        if (!d) return disconnect('wrong JSON data format');

        // verify sign, if verify failed then disconnect
        const p = this._clientsPassword.get(c.name || d.name);
        if (!utils.verifySign(p, d)) {
          c.send(utils.signJSON(c.password, {
            method: 'message',
            message: 'verify password failed',
          }));
          disconnect('very data sign failed');
          return;
        }

        if (!c.isVerified) {

          // handshake: {name: 'client name'}
          c.isVerified = true;
          c.name = d.name;
          c.password = p;
          this._tmpClients.delete(c.id);

          // if this client was connected, then exit the old connection
          if (this._clients.has(c.name)) {
            debug('client{name=%s} was connected, exit old connection', c.name);
            const oc = this._clients.get(c.name);
            oc.send(utils.signJSON(oc.password, {
              method: 'conflict',
            }), _ => {
              oc.exit();
            });
            this._clients.delete(c.name);
          }

          // register the new connection
          this._clients.set(c.name, c);
          c.send(utils.signJSON(c.password, {
            method: 'message',
            message: 'connected! good job',
          }));
          this.emit('client connected', c);
          debug('client{name=%s} verified: name=%s, message=%s', c.name, d.message);

        } else {

          if (d.method === 'message') {
            debug('client message: %s', d.message);
            this.emit('client message', c, d.message, d);
            return;
          }

          if (d.method === 'close_session') {
            debug('client request to close session: %s', d.session);
            this._agent.remove(d.session);
            return;
          }

          // other message
          this.emit('unknown method', c, d);

        }
      });

    });

    //--------------------------------------------------------------------------
    debug('created: server { host=%s, port=%s }', options.host, options.port);
  }

  setClientsPassword(clients) {
    if (this._clientsPassword) {
      this._clientsPassword.clear();
    } else {
      this._clientsPassword = new Map();
    }
    for (const n in clients) {
      this._clientsPassword.set(n, clients[n]);
    }
  }

  setListenPorts(listenPorts) {
    if (this._clientsInfodPortMap) {
      this._clientsInfodPortMap.clear();
    } else {
      this._clientsInfodPortMap = new Map();
    }
    listenPorts.forEach(item => this._clientsInfodPortMap.set(item.port, item.client));
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
