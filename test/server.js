const TCPTunnelServer = require('../server');

const server = new TCPTunnelServer({
  port: 5000,
  clients: {
    A: '123456',
    B: '234567',
  },
  ports: [
    {port: 5001, client: {name: 'A', port: 3000}},
    {port: 5002, client: {name: 'A', port: 3001}},
  ],
});
//console.log(server);
