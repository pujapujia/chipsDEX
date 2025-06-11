console.log('SCRIPT LOADED:', new Date().toISOString());
alert('script.js loaded! Open console (F12) and click Connect Wallet.');

// Global elements
const debugElement = document.getElementById('debug');
const statusElement = document.getElementById('status');

debugElement.innerText = 'JS running...';
console.log('Debug element:', debugElement);
console.log('Status element:', statusElement);

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM LOADED:', new Date().toISOString());

  const connectBtn = document.getElementById('connectWallet');
  console.log('Button:', connectBtn);

  if (!connectBtn || !statusElement || !debugElement) {
    console.error('ERROR: Elements missing!');
    statusElement.innerText = 'Error: Elements missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Elements missing!';
    alert('Elements missing!');
    return;
  }

  if (typeof ethers === 'undefined') {
    console.error('ERROR: Ethers.js missing!');
    statusElement.innerText = 'Error: Ethers.js missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Ethers.js missing!';
    alert('Ethers.js missing!');
    return;
  }

  connectBtn.addEventListener('click', () => {
    console.log('BUTTON CLICKED:', new Date().toISOString());
    alert('Button clicked! Connecting...');
    debugElement.innerText = 'Connecting...';
    connectWallet();
  });

  debugElement.innerText = 'Setup complete!';
  console.log('SETUP COMPLETE:', new Date().toISOString());
});

function connectWallet() {
  console.log('CONNECT WALLET:', new Date().toISOString());
  try {
    const provider = window.ethereum?.isMetaMask ? window.ethereum : null;
    if (!provider) {
      console.error('MetaMask not detected');
      statusElement.innerText = 'Error: Install MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask missing!';
      alert('MetaMask not detected!');
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
