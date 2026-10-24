function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function intParam(value, name = 'id') {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) throw httpError(400, `Qeybta ${name} waa in ay number tahay`);
  return n;
}

module.exports = { httpError, intParam };