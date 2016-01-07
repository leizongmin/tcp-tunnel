const TCPTunnelServer = require('../server');

const server = new TCPTunnelServer({
  port: 5000,
  clients: {
    A: '123456',
    B: '234567',
  },
});
//console.log(server);
