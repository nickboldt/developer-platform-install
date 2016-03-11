'use strict';

let child_process = require('child_process');
let path = require("path");
let chproc = require('child_process').spawnSync;

import Logger from '../../services/logger';

class Exec {
    //runs command and return output
    run(command, options, location) {
        return new Promise((resolve, reject) => {
            var result = chproc(command, options, { 'cwd' : location });
            console.log(result.stdout.toString());
            if(result.error) {
                reject(result.error);
            } else {
                resolve(result.stdout.toString());
            }
        });
    }
}

export default Exec;