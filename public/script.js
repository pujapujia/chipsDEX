console.log('SCRIPT LOADED:', new Date().toISOString());
alert('script.js loaded! Open console (F12) and click Connect Wallet.');

// Deklarasi global
const debugElement = document.getElementById('debug');
const statusElement = document.getElementById('status');

debugElement.innerText = 'JS Loaded...';
console.log('Debug element:', debugElement);
console.log('Status element:', statusElement);

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM LOADED:', new Date().toISOString());

  const connectBtn = document.getElementById('connectWallet');
  console.log('Button:', connectBtn);

  if (!connectBtn || !statusElement || !debugElement) {
    console.error('ERROR: Elements missing!');
    statusElement.innerText = 'Error: Elements not found!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Elements missing!';
    alert('Error: Elements not found!');
    return;
  }

  if (typeof ethers === 'undefined') {
    console.error('Error: Ethers.js not loaded!');
    statusElement.innerText = 'Error: Ethers.js missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Ethers.js missing!';
    alert('Error: Ethers.js not loaded!');
    return;
  }

  connectBtn.addEventListener('click', () => {
    console.log('Button clicked:', new Date().toISOString());
    alert('Button clicked! Connecting...');
    debugElement.innerText = 'Connecting...';
    connectWallet();
  });

  debugElement.innerText = 'Setup complete!';
  console.log('Setup complete:', new Date().toISOString());
});

function connectWallet() {
  console.log('Connect Wallet:', new Date().toISOString());
  try {
    const provider = window.ethereum?.isMetaMask ? window.ethereum : null;
    if (!provider) {
      console.error('MetaMask not detected!');
      statusElement.innerText = 'Error: Install MetaMask or disable Yoroi!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask missing!';
      alert('MetaMask not detected! Disable Yoroi.');
      return;
    }

    console.log('Provider:', provider);
    const web3Provider = new ethers.providers.Web3Provider(provider);
    console.log('Requesting accounts...');
    web3Provider
      .send('eth_requestAccounts', [])
      .then((accounts) => {
        console.log('Connected:', accounts[0]);
        statusElement.innerText = `Connected: ${accounts[0]}`;
        statusElement.classList.add('success');
        debugElement.innerText = 'Connected!';
        alert('Connected: ' + accounts[0]);
      })
      .catch((error) => {
        console.error('Connection failed:', error);
        statusElement.innerText = `Error: ${error.message}`;
        statusElement.classList.add('error');
        debugElement.innerText = `Error: ${error.message}`;
        alert('Connection failed: ' + error.message);
      });
  } catch (error) {
    console.error('Error:', error);
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
    alert('Error: ' + error.message);
  }
}
