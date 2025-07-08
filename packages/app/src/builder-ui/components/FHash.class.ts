import { Component } from './Component.class';
import { delay } from '../utils';
import { FunctionComponent } from './FunctionComponent.class';

const hashAlgos = [
  'md5', // MD5 (not recommended for cryptographic security)
  'sha1', // SHA-1 (not recommended for cryptographic security)
  'sha224', // SHA-224
  'sha256', // SHA-256
  'sha384', // SHA-384
  'sha512', // SHA-512
  'sha3-224', // SHA-3-224
  'sha3-256', // SHA-3-256
  'sha3-384', // SHA-3-384
  'sha3-512', // SHA-3-512
  'shake128', // SHAKE128
  'shake256', // SHAKE256
  'blake2b512', // BLAKE2b-512
  'blake2s256', // BLAKE2s-256
];
const encodings = ['hex', 'base64', 'base64url', 'latin1'];
export class FHash extends FunctionComponent {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      algorithm: {
        type: 'select',
        label: 'Hash Algorithm',
        //hint: 'Action to perform',
        value: 'md5',
        options: hashAlgos,
      },
      encoding: {
        type: 'select',
        label: 'Output encoding',
        //hint: 'Output encoding',
        value: 'hex',
        options: encodings,
      },
    };

    const dataEntries = ['algorithm', 'encoding'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ Output config ] ==================

    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Hash'];
    this.properties.defaultInputs = ['Data'];

    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#0083ff';
    // #endregion

    this.properties.title = `${this.data.algorithm.toUpperCase()} :: ${this.data.encoding}`;
    this.drawSettings.displayName = 'F:Hash';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `${this.data.algorithm.toUpperCase()} :: ${this.data.encoding}`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });
  }

  // private async getCryptoHashes() {
  //     const defaultValues = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];
  //     if (cryptoHashesCache) return cryptoHashesCache;
  //     console.log('getComponentsCollections');
  //     const result = await fetch('/api/page/builder/data/cryptoHashes').then((res) => res.json());
  //     if (result.error) {
  //         return defaultValues;
  //     }
  //     console.log('cryptoHashesCache', result);
  //     const collectionResult = result?.data || defaultValues;

  //     cryptoHashesCache = result?.data;
  //     return cryptoHashesCache;
  // }
}
