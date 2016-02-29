'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import VirtualBoxInstall from './virtualbox';


class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Cygwin', 720, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;
    this.downloadedFileName = 'cygwin.exe';
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.cygwinPathScript = path.join(this.installerDataSvc.tempDir(), 'set-cygwin-path.ps1');
  }

  static key() {
    return 'cygwin';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    var downloads = path.normalize(path.join(__dirname,"../../.."));
    if(! fs.existsSync(path.join(downloads, this.downloadedFileName))) {
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
    let vboxInstall = this.installerDataSvc.getInstallable(VirtualBoxInstall.key());
    if( vboxInstall !== undefined && vboxInstall.isInstalled() ) {
      this.postVirtualboxInstall(progress, success, failure);
    } else {
      progress.setStatus('Waiting for VirtualBox to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'virtualbox') {
          this.postVirtualboxInstall(progress, success, failure);
        }
      });
    }
  }

  postVirtualboxInstall(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CygwinInstall.key(), progress, success, failure);

    let opts = [
      '--no-admin',
      '--quiet-mode',
      '--only-site',
      '--site',
      'http://mirrors.xmission.com/cygwin',
      '--root',
      this.installerDataSvc.cygwinDir(),
      '--categories',
      'Base',
      '--packages',
      'openssh,rsync'
    ];
    let data = [
      '$cygwinPath = "' + path.join(this.installerDataSvc.cygwinDir(), 'bin') + '"',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$cygwinPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');

    installer.execFile(this.downloadedFile, opts)
    .then((result) => { return installer.writeFile(this.cygwinPathScript, data, result); })
    .then((result) => { return installer.execFile('powershell',
      [
        '-ExecutionPolicy',
        'ByPass',
        '-File',
        this.cygwinPathScript
      ], result); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }
}

export default CygwinInstall;
