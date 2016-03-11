'use strict';

let child_process = require('child_process');
let path = require("path");
let chproc = require('child_process').spawnSync;

import Exec from "../../browser/model/helpers/Exec.js"

class ExecMock extends Exec {
    //runs command and return output
    run(command, options, location) {
        return new Promise((resolve, reject) => {
            if(location) {
                var pLoc = path.parse(location);
                if(pLoc.base === "null") {
                    resolve(null);
                } else if(pLoc.base === "unknown") {
                    resolve("unknown");
                }
                resolve(pLoc.base);
            }
            resolve("1.7.4");
        });
    }
}

export default ExecMock;
