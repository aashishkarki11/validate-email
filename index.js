'use strict';

const dns = require('dns');
const net = require('net');

const dnsPromises = dns.promises;

// Helper to validate email based on regex
const EMAIL_REGEX = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

const validateEmail = (email) => {
  const isValid = typeof email === 'string' &&
    email.length > 5 &&
    email.length < 61 &&
    EMAIL_REGEX.test(email);

  return isValid ? email.toLowerCase() : false;
};

const selectMailServer = (resolvedMxRecords) => {
  if (resolvedMxRecords.length === 1) {
    return resolvedMxRecords[0].exchange;
  }
  const { exchange: lowestPriorityExchange } = resolvedMxRecords.reduce((prev, current) =>
    (current.priority < prev.priority) ? current : prev
  );
  return lowestPriorityExchange;
};

const validateMailServer = async (address, options) => {
  let step = 0;
  const COMM = [
    'helo ' + options.host + '\n',
    'mail from:<' + options.from + '>\n',
    'rcpt to:<' + options.to + '>\n'
  ];

  return new Promise(function (resolve, reject) {
    const socket = net.createConnection(25, address);

    socket.setTimeout(options.timeout, function () {
      socket.destroy();
      resolve(false);
    });

    socket.on('data', function (data) {
      console.log(data.toString())
      
      if (data.toString()[0] !== '2') {
        socket.destroy();
        reject(false);
        // reject(new Error('refuse'));
      }
      if (step < 3) {
        console.log(COMM[step])
        socket.write(COMM[step], function () {
          step++;
        });
      } else {
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', function (err) {
      socket.destroy();
      if (err.code === 'ECONNRESET') {
        reject(new Error('refuse'));
      } else {
        reject(err);
      }
    })
  });
};

const totalEmailValidation = async (to, from, timeout) => {
  try {
    const fullEmail = validateEmail(to);
    const fromEmail = validateEmail(from);
    if (!fullEmail) throw (new Error('Wrong to email.'));
    if (!fromEmail) throw (new Error('Wrong from email.'));
    const emailDomain = to.split('@')[1];
    const resolvedMxRecords = await dnsPromises.resolveMx(emailDomain);
    if (resolvedMxRecords.length === 0) throw (new Error('Wrong'));
    const selectedMailServer = selectMailServer(resolvedMxRecords);
    const options = {
      to,
      from,
      host: to.split('@')[1],
      timeout: timeout || 5000
    };
    const serverResponse = await validateMailServer(selectedMailServer, options);
    return serverResponse;
  } catch (err) {
    // throw err;
    return false;
  }
}

const checkFuntion = async () => {
  const res = await totalEmailValidation("aashishkarki11@gmail.com", "aashishkarkix@gmail.com" ,5000);
  console.log(res)
}

checkFuntion()









