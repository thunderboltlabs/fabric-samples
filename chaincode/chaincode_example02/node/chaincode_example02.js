/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

const shim = require('fabric-shim');
const util = require('util');

var Chaincode = class {

  // Initialize the chaincode
  async Init(stub) {
    console.info('========= example02 Init =========');
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    let args = ret.params;
    // initialise only if 4 parameters passed.
    if (args.length != 4) {
      return shim.error('Incorrect number of arguments. Expecting 4');
    }

    let A = args[0];
    let B = args[2];
    let Aval = args[1];
    let Bval = args[3];

    if (typeof parseFloat(Aval) !== 'number' || typeof parseFloat(Bval) !== 'number') {
      return shim.error('Expecting number value for asset holding');
    }

    try {
      await stub.putState(A, Buffer.from(Aval));
      try {
        await stub.putState(B, Buffer.from(Bval));
        return shim.success();
      } catch (err) {
        return shim.error(err);
      }
    } catch (err) {
      return shim.error(err);
    }
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    let method = this[ret.fcn];
    if (!method) {
      console.log('no method of name:' + ret.fcn + ' found');
      return shim.success();
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async invoke(stub, args) {
    if (args.length != 4 ) {
      throw new Error('Incorrect number of arguments. Expecting 5');
    }

    let fromAccount = args[0];
    let toAccount = args[2];
    if (!fromAccount || !toAccount) {
      throw new Error('asset holding must not be empty');
    }

    let fromAmount = parseFloat(args[1]);
    let toAmount = parseFloat(args[3]);

    console.log (`Debiting ${fromAmount} from ${fromAccount} and crediting ${toAmount} to ${toAccount}`);
    if (!fromAmount || !toAmount) {
      throw new Error('Transfer values must not be empty')
    }

    // Get the state from the ledger
    let fromValBytes = await stub.getState(fromAccount);
    if (!fromValBytes) {
      throw new Error(`Failed to get state of asset holder ${fromAccount}`);
    }
    let val = parseInt(fromValBytes.toString());

    let toValBytes = await stub.getState(toAccount);
    if (!toValBytes) {
      throw new Error(`Failed to get state of asset holder ${toAccount}`);
    }

    let toVal = parseInt(toValBytes.toString());
    let fromVal = parseInt(fromValBytes.toString());
    // Perform the execution
    console.log (`Pre-execution fromAmount is ${fromAmount} and toAmount is ${toAmount}`);
    if (typeof fromAmount !== 'number' || typeof toAmount !== 'number') {
      throw new Error('Expecting number values for amounts to be transferred');
    }

    fromVal = fromVal - fromAmount;
    toVal = toVal + toAmount;
    console.info(util.format('fromVal = %d, toVal= %d\n', fromVal, toVal));

    // Write the states back to the ledger
    await stub.putState(fromAccount, Buffer.from(fromVal.toString()));
    await stub.putState(toAccount, Buffer.from(toVal.toString()));

  }

  // Deletes an entity from state
  async delete(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }

    let A = args[0];

    // Delete the key from the state in ledger
    await stub.deleteState(A);
  }

  // query callback representing the query of a chaincode
  async query(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the person to query')
    }

    let jsonResp = {};
    let A = args[0];

    // Get the state from the ledger
    let Avalbytes = await stub.getState(A);
    if (!Avalbytes) {
      jsonResp.error = 'Failed to get state for ' + A;
      throw new Error(JSON.stringify(jsonResp));
    }

    jsonResp.name = A;
    jsonResp.amount = Avalbytes.toString();
    console.info('Query Response:');
    console.info(jsonResp);
    return Avalbytes;
  }
};

shim.start(new Chaincode());
