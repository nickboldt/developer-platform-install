'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, installFile) {
    super('VirtualBox', 700, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.version = version;
    this.revision = revision;
    this.downloadedFileName = 'virtualBox-' + this.version + '.exe';
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
  }

  static key() {
    return 'virtualbox';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    var downloads = path.normalize(path.join(__dirname,"../../.."));
    console.log(downloads);
    if(! fs.existsSync(path.join(downloads, this.downloadedFileName))) {
      //if(fs.existsSync()))
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);

      let downloader = new Downloader(progress, success, failure);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = path.join(downloads, this.downloadedFileName);
      success();
    }
  }

  install(progress, success, failure) {
    let installer = new Installer(VirtualBoxInstall.key(), progress, success, failure);

    installer.execFile(this.downloadedFile,
      ['--extract',
        '-path',
        this.installerDataSvc.tempDir(),
        '--silent'])
    .then((result) => { return this.setup(installer, result) })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }

  setup(installer, result) {
    return new Promise((resolve, reject) => {
        return this.installMsi(installer,resolve,reject);
      });
  }

  installMsi(installer,resolve,reject) {
    installer.progress.setStatus('Installing');
    return installer.execFile('msiexec',
    [
      '/i',
      this.msiFile,
      'INSTALLDIR=' + this.installerDataSvc.virtualBoxDir(),
      '/qb!',
      '/norestart',
      '/Liwe',
      path.join(this.installerDataSvc.installDir(), 'vbox.log')
    ]).then((res) => { return resolve(res); })
    .catch((err) => { return reject(err); });
  }
}

export default VirtualBoxInstall;
