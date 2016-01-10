'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const path = require('path');
const child_process = require('child_process');
const TCPTunnelServer = require('../server');
const TCPTunnelClient = require('../client');


exports.Server = TCPTunnelServer;
exports.client = TCPTunnelClient;

exports.createServer = function (options) {
  return new TCPTunnelServer(options);
};
exports.createClient = function (options) {
  return new TCPTunnelClient(options);
};


function spawn(cmd, args) {
  return child_process.spawn(path.resolve(__dirname, '../bin', cmd + '.js'), args, {stdio: [0, 0, 0]});
}

exports.command = {};
exports.command.runServer = function (configFile) {
  spawn('server', ['-c', configFile]);
};
exports.command.reloadServer = function (configFile) {
  spawn('server', ['-r', '-c', configFile]);
};
exports.command.runClient = function (configFile) {
  spawn('client', ['-c', configFile]);
};
