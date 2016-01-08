'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const net = require('net');
const EventEmitter = require('events');
const utils = require('../lib/utils');
const debug = utils.debug('server:agent');


class TCPTunnelServerAgent extends EventEmitter {

  /**
   * port agent
   */
  constructor() {
    super();

    this._sessions = new Map();

    this._server = net.createServer();
    this._server.listen(0);

    this._sessions = new Map();

    this._server.on('connection', c => {

      debug('new connection: host=%s, port=%s', c.remoteAddress, c.remotePort);
      c.sessionId = null;

      this.emit('new connection', c);

      c.once('close', _ => {
        this.emit('connection close', c);
      });

      const disconnect = (reason, s) => {
        debug('disconnect{host=%s, port=%s}: reason=%s', c.remoteAddress, c.remotePort, reason);
        c.destroy();
        if (s) s.destroy();
        this.remove(c.sessionId);
      };

      const setupPipe = s => {
        debug('pipe: server {host=%s, port=%s} client {host=%s, port=%s}',
              s.remoteAddress, s.remotePort, c.remoteAddress, c.remotePort);

        utils.pipeTwoWay(c, s);

        c.on('close', _ => {
          disconnect('client connection closed', s);
        });
        c.on('error', err => {
          disconnect(`client connection error: ${err}`, s)
        });

        s.on('close', _ => {
          disconnect('server connection closed', s);
        });
        s.on('error', err => {
          disconnect(`server connection error: ${err}`, s)
        });

        this.emit('pipe connection', c, s);

      };

      c.once('data', d => {

        // verify data
        d = utils.tryParseJSON(d);
        if (!d) return disconnect('wrong JSON data format');
        if (!d.session) return disconnect('missing session ID');
        const session = this._sessions.get(d.session);
        if (!session) return disconnect('invalid session ID');
        if (!utils.verifySign(session.password, d)) return disconnect('verify data sign failed');

        if (d.method === 'connected') {

          // succeed
          debug('connection{host=%s, port=%s} verified: session=%s', c.remoteAddress, c.remotePort, d.session);
          c.sessionId = d.session;
          setupPipe(session.connection);

        } else {

          // cannot connect to the port on client side
          debug('connection{host=%s, port=%s} failed: session=%s', c.remoteAddress, c.remotePort, d.session);
          disconnect('cannot connect to the client side port', session.connection);

        }

      });

    });

  }

  /**
   * add session
   *
   * @param {String} sid
   * @param {String} clientName
   * @param {String} password
   * @param {Object} connection
   */
  add(sid, clientName, password, connection) {
    debug('add: sid=%s, clientName=%s, password=%s, client { host=%s, port=%s }',
          sid, clientName, password, connection.remoteAddress, connection.remotePort);
    this._sessions.set(sid, {id: sid, clientName, password, connection});
    connection.once('close', _ => {
      this.remove(sid);
    });
  }

  /**
   * remove session by id
   *
   * @param {String} sid
   */
  remove(sid) {
    debug('remove: sid=%s', sid);
    const session = this._sessions.get(sid);
    if (session) session.connection.destroy();
  }

  /**
   * remove all sessions by client name
   *
   * @param {String} name
   */
  removeAllByClientName(name) {
    debug('remove all by client name: %s', name);
    for (const id of this._sessions.keys()) {
      const session = this._sessions.get(id);
      if (session.clientName === name) {
        this.remove(id);
      }
    }
  }

  /**
   * get agent server listening port
   *
   * @return {Number}
   */
  getListenPort() {
    return this._server.address().port;
  }

}

module.exports = TCPTunnelServerAgent;
