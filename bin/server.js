#!/usr/bin/env node

'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const program = require('commander');
const tracer = require('tracer');
const utils = require('../lib/utils');
const TCPTunnelServer = require('../server');
const packageInfo = require('../package.json');


const logger = tracer.colorConsole({
  dateformat: 'yyyy-mm-dd HH:MM:ss.L',
  format: '{{timestamp}} <{{title}}> {{message}}',
});


program
  .version(packageInfo.version)
  .option('-c, --config <config_file>', 'specify a config file')

program.on('--help', function () {
  console.log('  Usage:');
  console.log('');
  console.log('    $ ttserver -c [config-file]');
  console.log('');
  console.log('  For more details, please see: https://npmjs.org/package/tcp-tunnel')
});

program.parse(process.argv);


if (!program.config) utils.die('please specify a config file!');
if (!fs.existsSync(program.config)) utils.die(`config file ${program.config} does not exists`);

logger.info(`load config file ${program.config}`);
const parseConfigResult = utils.parseConfig(fs.readFileSync(program.config).toString());
if (parseConfigResult.error.length > 0) utils.die(`parse config file error:\n${parseConfigResult.error.join('\n')}`);
const config = parseConfigResult.config;


function convertRuleToPorts(rule) {
  return Object.keys(rule).map(port => {
    return {
      port: Number(port),
      client: {
        name: rule[port].client,
        port: Number(rule[port].port),
      }
    };
  });
}

const serverOptions = {
  port: Number(config.value.port),
  clients: config.client,
  listenPorts: convertRuleToPorts(config.rule),
};
const server = new TCPTunnelServer(serverOptions);

server.once('listening', _ => {
  logger.info('server listening on port %s', config.value.port);
});

server.on('error', err => {
  logger.error('server error: %s', err);
});

server.once('exit', _ => {
  logger.info('server exit');
});

server.on('client connected', c => {
  const s = c._socket;
  logger.info('client %s connected from %s:%s', c.name, s.remoteAddress, s.remotePort);
});

server.on('client message', (c, msg) => {
  logger.info('message from client %s: %s', c.name, msg);
});

server.on('client disconnected', c => {
  logger.info('client %s disconnected', c.name || `#${c.id}`);
});

server.on('client error', (c, err) => {
  logger.warn('error from client %s: %s', c.name || `#${c.id}`, err);
});

server.on('agent new connection', c => {
  logger.log('agent new connection from %s:%s', c.remoteAddress, c.remotePort);
});

server.on('agent connection close', c => {
  logger.log('agent connection from %s:%s has been closed', c.remoteAddress, c.remotePort);
});

server.on('agent pipe connection', (c, s) => {
  logger.log('agent connection pipe %s:%s to %s:%s',
             c.remoteAddress, c.remotePort, s.remoteAddress, s.remotePort);
});

server.on('port error', (port, s, err) => {
  logger.warn('server port %s error: %s', port, err);
});

server.on('port close', (port, s) => {
  logger.log('server port %s has been closed', port);
});

server.on('port new connection', (port, server, client, conn) => {
  logger.log('accepted new connection on port %s<%s> from %s:%s',
             port, client.name, conn.remoteAddress, conn.remotePort);
});


