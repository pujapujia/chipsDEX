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

// CHIPS testnet config
const CHIPS_TESTNET = {
  chainId: '0x2ca', // 714
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.178.3.101:8080'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM LOADED:', new Date().toISOString());

  const connectBtn = document.getElementById('connectWallet');
  console.log('Button:', connectBtn);

  if (!connectBtn || !statusElement || !debugElement || !swapBox) {
    console.error('ERROR: Elements missing!');
    statusElement.innerText = 'Error: Elements missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Elements missing!';
    return;
  }

  if (typeof ethers === 'undefined') {
    console.error('ERROR: Ethers.js missing!');
    statusElement.innerText = 'Error: Ethers.js missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Ethers.js missing!';
    return;
  }

  connectBtn.addEventListener('click', () => {
    console.log('BUTTON CLICKED:', new Date().toISOString());
    debugElement.innerText = 'Connecting...';
    connectWallet();
  });

  swapButton.addEventListener('click', () => {
    console.log('SWAP BUTTON CLICKED:', new Date().toISOString());
    debugElement.innerText = 'Swapping...';
    initiateSwap();
  });

  amountIn.addEventListener('input', updatePriceEstimate);

  debugElement.innerText = 'Setup complete!';
  console.log('SETUP COMPLETE:', new Date().toISOString());
});

let provider, signer, account;

// Mock token addresses (replace with actual)
const CHIPS_TOKEN = '0xYOUR_CHIPS_TOKEN_ADDRESS';
const USDT_TOKEN = '0xYOUR_USDT_TOKEN_ADDRESS';
const SWAP_CONTRACT_ADDRESS = '0xYOUR_SWAP_CONTRACT_ADDRESS';

// Example AMM ABI (replace with actual)
const SWAP_CONTRACT_ABI = [
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

// USDT contract ABI (for mint/burn, if applicable)
const USDT_ABI = [
  {
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function connectWallet() {
  console.log('CONNECT WALLET:', new Date().toISOString());
  try {
    if (!window.ethereum?.isMetaMask) {
      console.error('MetaMask not detected');
      statusElement.innerText = 'Error: Install MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask missing!';
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum, {
      chainId: 714,
      name: 'chips-testnet',
      ensAddress: null // Disable ENS
    });

    // Switch to CHIPS testnet
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2ca' }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CHIPS_TESTNET]
        });
      } else {
        throw switchError;
      }
    }

    const accounts = await provider.send('eth_requestAccounts', []);
    account = accounts[0];
    signer = provider.getSigner();
    console.log('Connected:', account);
    statusElement.innerText = `Connected: ${account}`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Connected!';
    swapBox.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !provider) return;
  try {
    const amount = ethers.utils.parseUnits(amountIn.value || '0', 18);
    // Mock price (replace with contract call)
    const price = 1; // 1 CHIPS = 1 USDT
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
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    return;
  }
  try {
    const contract = new ethers.Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const amountOutMin = ethers.utils.parseUnits('0', 18); // Slippage
    const path = tokenIn.value === 'CHIPS' ? [CHIPS_TOKEN, USDT_TOKEN] : [USDT_TOKEN, CHIPS_TOKEN];
    const to = account;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 30;

    console.log('Swapping:', { amount, amountOutMin, path, to, deadline });
    statusElement.innerText = 'Swapping...';
    debugElement.innerText = 'Swapping...';

    // Mint/Burn logic for USDT
    const usdtContract = new ethers.Contract(USDT_TOKEN, USDT_ABI, signer);
    if (tokenOut.value === 'USDT') {
      // CHIPS → USDT: Mint USDT
      console.log('Minting USDT:', amount);
      const mintTx = await usdtContract.mint(amount);
      await mintTx.wait();
      console.log('Minted USDT:', mintTx.hash);
    } else {
      // USDT → CHIPS: Burn USDT
      console.log('Burning USDT:', amount);
      const burnTx = await usdtContract.burn(amount);
      await burnTx.wait();
      console.log('Burned USDT:', burnTx.hash);
    }

    // AMM swap
    const tx = await contract.swapExactTokensForTokens(amount, amountOutMin, path, to, deadline);
    console.log('Transaction sent:', tx.hash);
    statusElement.innerText = `Swapping... (Tx: ${tx.hash})`;
    await tx.wait();
    console.log('Swap complete:', tx.hash);
    statusElement.innerText = `Swap complete! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Swap complete!';
  } catch (error) {
    console.error('Swap error:', error);
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}
