#!/usr/bin/env node

'use strict';

/**
 * TCP Tunnel
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const clc = require('cli-color');
const program = require('commander');
const utils = require('../lib/utils');
const TCPTunnelServer = require('../server');
const packageInfo = require('../package.json');
const logger = utils.createLogger();
require('./header');


program
  .version(packageInfo.version)
  .option('-c, --config <config_file>', 'specify a config file')
  .option('-r, --reload', 'reload config file')

program.on('--help', _ => {
  const help = clc.yellow(`
  Usage:

    $ ttclient -c [config-file]

  Example config file:
  -------------------
    :value
    port = 5000

    :client
    A:123456
    B:123456

    :rule
    5001 -> A:3000
    5002 -> B:3000
  -------------------

  For more details, please see https://github.com/leizongmin/tcp-tunnel
  `);
  console.log(help);
});

program.parse(process.argv);


if (!program.config) {
  program.help();
  utils.die('please specify a config file!');
}
program.config = path.resolve(program.config);
if (!fs.existsSync(program.config)) utils.die(`config file ${program.config} does not exists`);

logger.info(`load config file ${program.config}`);
const parseConfigResult = utils.parseConfig(fs.readFileSync(program.config).toString());
if (parseConfigResult.error.length > 0) utils.die(`parse config file error:\n${parseConfigResult.error.join('\n')}`);
const config = parseConfigResult.config;


const pidFile = path.resolve(os.tmpdir(), `ttserver-port-${config.value.port}.pid`);
if (program.reload) {
  if (!fs.existsSync(pidFile)) {
    logger.error('PID file does not exists, please make sure ttserver is running');
    process.exit(-2);
  }
  const pid = Number(fs.readFileSync(pidFile).toString());
  logger.warn('will send reload command to PID#%s...', pid);
  process.kill(pid, 'SIGHUP');
  logger.warn('command has been sent');
  process.exit(-3);
} else {
  fs.writeFileSync(pidFile, process.pid.toString());
  logger.info('PID save to file %s', pidFile);
}


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
  logger.info('service PID#%s listening on port %s', process.pid, config.value.port);
});

server.on('error', err => {
  logger.error('server error: %s', err);
  process.exit(-1);
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


// print service status
setInterval(_ => {
  const info = {
    clients: server._clients.size,
    sessions: server._agent._sessions.size,
  };
  logger.info(utils.getProcessStatus(info));
}, 10000);


process.on('exit', code => {
  logger.warn('process exit with code %s', code);
});

process.on('SIGINT', _ => {
  logger.warn('got SIGINT, going to shutdown...');
  process.exit();
});

process.on('SIGHUP', _ => {
  logger.warn('go SIGHUP, going to reload config...');
  const result = utils.parseConfig(fs.readFileSync(program.config).toString());
  if (result.error.length > 0) {
    console.log(clc.red(`parse config file error:\n${result.error.join('\n')}`));
  } else {
    const config = result.config;
    server.setClientsPassword(config.client);
    server.setListenPorts(convertRuleToPorts(config.rule));
    logger.info('new config reloaded');
  }
});

