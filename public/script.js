console.log('SCRIPT LOADED:', new Date().toISOString());
alert('script.js loaded! Open console (F12) and click Connect Wallet.');

// Global elements
const debugElement = document.getElementById('debug');
const statusElement = document.getElementById('status');
const swapBox = document.getElementById('swapBox');
const tokenIn = document.getElementById('tokenIn');
const amountIn = document.getElementById('amountIn');
const tokenOut = document.getElementById('tokenOut');
const amountOut = document.getElementById('amountOut');
const priceInfo = document.getElementById('priceInfo');
const swapButton = document.getElementById('swapButton');

debugElement.innerText = 'JS running...';
console.log('Debug element:', debugElement);
console.log('Status element:', statusElement);

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM LOADED:', new Date().toISOString());

  const connectBtn = document.getElementById('connectWallet');
  console.log('Button:', connectBtn);

  if (!connectBtn || !statusElement || !debugElement || !swapBox) {
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

  // Swap logic
  swapButton.addEventListener('click', () => {
    console.log('SWAP BUTTON CLICKED:', new Date().toISOString());
    alert('Initiating swap...');
    debugElement.innerText = 'Swapping...';
    initiateSwap();
  });

  amountIn.addEventListener('input', () => {
    updatePriceEstimate();
  });

  debugElement.innerText = 'Setup complete!';
  console.log('SETUP COMPLETE:', new Date().toISOString());
});

let provider, signer, account;

// Replace with your swap contract address and ABI
const SWAP_CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS_HERE';
const SWAP_CONTRACT_ABI = [
  // Example ABI, replace with actual ABI
  {
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function connectWallet() {
  console.log('CONNECT WALLET:', new Date().toISOString());
  try {
    provider = window.ethereum?.isMetaMask ? new ethers.providers.Web3Provider(window.ethereum) : null;
    if (!provider) {
      console.error('MetaMask not detected');
      statusElement.innerText = 'Error: Install MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask missing!';
      alert('MetaMask not detected!');
      return;
    }

    console.log('Provider:', provider);
    const accounts = await provider.send('eth_requestAccounts', []);
    account = accounts[0];
    signer = provider.getSigner();
    console.log('Connected:', account);
    statusElement.innerText = `Connected: ${account}`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Connected!';
    swapBox.style.display = 'block'; // Show swap UI
    alert('Connected: ' + account);
  } catch (error) {
    console.error('Error:', error);
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
    alert('Error: ' + error.message);
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !provider) return;
  try {
    // Mock price estimate (replace with contract call)
    const amount = ethers.utils.parseUnits(amountIn.value || '0', 18);
    const price = 1; // Mock: 1 CHIPS = 1 USDT
    const amountOutValue = ethers.utils.formatUnits(amount.mul(price), 18);
    amountOut.value = amountOutValue;
    priceInfo.innerText = `Price: 1 ${tokenIn.value} = ${price} ${tokenOut.value}`;
  } catch (error) {
    console.error('Price estimate error:', error);
    priceInfo.innerText = `Error: ${error.message}`;
  }
}

async function initiateSwap() {
  if (!provider || !signer || !amountIn.value) {
    alert('Please connect wallet and enter amount!');
    return;
  }
  try {
    const contract = new ethers.Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const amountOutMin = ethers.utils.parseUnits('0', 18); // Slippage tolerance
    const path = ['TOKEN_A_ADDRESS', 'TOKEN_B_ADDRESS']; // Replace with token addresses
    const to = account;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 30; // 30 min

    console.log('Swapping:', amount, amountOutMin, path, to, deadline);
    const tx = await contract.swapExactTokensForTokens(amount, amountOutMin, path, to, deadline);
    console.log('Transaction sent:', tx.hash);
    statusElement.innerText = `Swapping... (Tx: ${tx.hash})`;
    debugElement.innerText = 'Swapping...';
    await tx.wait();
    console.log('Swap complete:', tx.hash);
    statusElement.innerText = `Swap complete! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Swap complete!';
    alert('Swap complete: ' + tx.hash);
  } catch (error) {
    console.error('Swap error:', error);
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
    alert('Swap error: ' + error.message);
  }
}
