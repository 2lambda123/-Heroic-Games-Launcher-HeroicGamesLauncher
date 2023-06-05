// Widevine VMP signing

exports.default = async function (context) {

    if(!process.env.EVS_ACCOUNT_NAME || !process.env.EVS_PASSWD) {
      console.log("Skipping VMP sign, EVS_ env vars are unset")
      return 
    }

    // Make sure we don't leave an outdated electron.exe.sig laying about
    if (context.packager.appInfo.productFilename !== 'electron') {
        const fs = require("fs");
        const path = context.appOutDir + '/electron.exe.sig'
        if (fs.existsSync(path)) {
        fs.unlinkSync(path)
    }
  
    const spawnSync = require("child_process").spawnSync; 
    const vmp = spawnSync('python3', [
        '-m',
        'castlabs_evs.vmp',
        '-n',
        'sign-pkg',
        context.appOutDir
      ],
      {
        stdio: 'inherit' 
      });
  
    if (vmp.status != 0) {
      throw new Error('vmp failed with code: ' + vmp.status);
    }
  }
}
