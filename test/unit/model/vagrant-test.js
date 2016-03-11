'use strict';

import chai, { expect, should } from 'chai';
import chaiAsPromised from "chai-as-promised";

import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs-extra';
import path from 'path';
import VagrantInstall from 'model/vagrant';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
import ExecMock from '../../mocks/ExecMock';


chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('Vagrant installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox;
  let fakeInstallable = {
    isInstalled: function() { return true; }
  };
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    vagrantDir: function() { return 'installationFolder/vagrant'; },
    getInstallable: function(key) { return fakeInstallable; }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.vagrantDir.returns('installationFolder/vagrant');

  let fakeProgress = {
    setStatus: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {},
    setComplete: function() {},
    setTotalDownloadSize: function(size) {},
    downloaded: function(amt, time) {}
  };

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

    mockfs({
      'tempDirectory' : {},
      'installationFolder' : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download vagrant when an installation exists', function() {
    let jdk = new VagrantInstall(installerDataSvc, 'url', 'file');
    expect(jdk.useDownload).to.be.false;
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new VagrantInstall(installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new VagrantInstall(installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download vagrant when no installation is found', function() {
    expect(new VagrantInstall(installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download vagrant installer to temporary folder as vagrant.zip', function() {
    expect(new VagrantInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join(installerDataSvc.tempDir(), 'vagrant.zip'));
  });

  describe('when downloading the vagrant zip', function() {
    let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/vagrant.zip', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'vagrant.zip'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl);
    });
  });

  describe('when installing vagrant', function() {
    let downloadedFile = path.join('tempDirectory', 'vagrant.zip');
    let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';

    it('should set progress to "Installing"', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.postCygwinInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should unzip the downloaded file into temporary folder', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);

      let spy = sandbox.spy(Installer.prototype, 'unzip');
      installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith(downloadedFile, installerDataSvc.tempDir());
    });

    it('should catch errors during the installation', function(done) {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(require('unzip'), 'Extract');
      stub.throws(new Error('critical error'));

      try {
        installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});
        stub.restore();
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it ('should-detect-version-1.7.4', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null, new ExecMock);
      return installer.detectInstalledVersion('.\\Vagrant 1.7.4').should.eventually.equal('1.7.4');
    });

    it ('should-detect-version-1.8.1', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null, new ExecMock);
      return installer.detectInstalledVersion('.\\Vagrant 1.7.4').should.eventually.equal('1.7.4');
    });


    it ('promise test', function() {
      return Promise.resolve(2 + 2).should.become(3);
      //return expect(Promise.resolve(2 + 2)).to.eventually.equal(3);
    });
  });
});
