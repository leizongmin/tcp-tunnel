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

      const disconnect = reason => {
        debug('disconnect{host=%s, port=%s}: reason=%s', c.remoteAddress, c.remotePort, reason);
        c.destroy();
        this._sessions.delete(c.sessionId);
      };

      const setupPipe = s => {
        debug('pipe: server {host=%s, port=%s} client {host=%s, port=%s}',
              s.remoteAddress, s.remotePort, c.remoteAddress, c.remotePort);

        utils.pipeTwoWay(c, s);

        c.on('close', _ => {
          s.destroy();
          disconnect('client connection closed');
        });
        c.on('error', err => {
          s.destroy();
          disconnect(`client connection error: ${err}`)
        });

        s.on('close', _ => {
          s.destroy();
          disconnect('server connection closed');
        });
        s.on('error', err => {
          s.destroy();
          disconnect(`server connection error: ${err}`)
        });

      };

      c.once('data', d => {

        // verify data
        d = utils.tryParseJSON(d);
        if (!d) return disconnect('wrong JSON data format');
        if (!d.session) return disconnect('missing session ID');
        const session = this._sessions.get(d.session);
        if (!session) return disconnect('invalid session ID');
        if (!utils.verifySign(session.password, d)) return disconnect('verify data sign failed');

        // succeed
        debug('connection{host=%s, port=%s} verified: session=%s', c.remoteAddress, c.remotePort, d.session);
        c.sessionId = d.session;
        setupPipe(session.connection);

      });

    });

  }

  add(sid, password, connection) {
    debug('add: sid=%s, password=%s, client { host=%s, port=%s }',
          sid, password, connection.remoteAddress, connection.remotePort);
    this._sessions.set(sid, {password, connection});
  }

  getListenPort() {
    return this._server.address().port;
  }

}

module.exports = TCPTunnelServerAgent;
