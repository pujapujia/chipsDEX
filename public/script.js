console.log('SCRIPT LOADED:', new Date().toISOString());

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

const CHIPS_TESTNET = {
  chainId: '714',
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.178.3.101:8545'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWallet');

  if (!connectBtn || !statusElement || !debugElement || !swapBox) {
    statusElement.innerText = 'Error: Elements missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Elements missing!';
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js missing!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Ethers.js missing!';
    return;
  }

  connectBtn.addEventListener('click', () => {
    debugElement.innerText = 'Connecting...';
    connectWallet();
  });

  swapButton.addEventListener('click', () => {
    debugElement.innerText = 'Swapping...';
    initiateSwap();
  });

  amountIn.addEventListener('input', updatePriceEstimate);

  debugElement.innerText = 'Setup complete!';
});

let provider, signer, account;

const USDT_ADDRESS = '0x5A5cb08Ffea579Ac235e3Ee34B00854e4cEfCbBA'; // Ganti
const DEX_ADDRESS = '0x3FB0be3029ADCecb52B0cc94825049FC2b9c0dd2'; // Ganti

const DEX_ABI = [
  {
    "inputs": [{ "name": "usdtAmountOut", "type": "uint256" }],
    "name": "swapChipsToUsdt",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "usdtAmountIn", "type": "uint256" }],
    "name": "swapUsdtToChips",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "chipsIn", "type": "uint256" }],
    "name": "getUsdtOut",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{ "name": "usdtIn", "type": "uint256" }],
    "name": "getChipsOut",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  }
];

const USDT_ABI = [
  {
    "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function connectWallet() {
  try {
    if (!window.ethereum?.isMetaMask) {
      statusElement.innerText = 'Error: Install MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask missing!';
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum, {
      chainId: 714,
      name: 'chips-testnet',
      ensAddress: null
    });

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
    statusElement.innerText = `Connected: ${account}`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Connected!';
    swapBox.style.display = 'block';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !provider) return;
  try {
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);
    const amount = ethers.utils.parseUnits(amountIn.value || '0', 18);
    let amountOut;
    if (tokenIn.value === 'CHIPS') {
      amountOut = await contract.getUsdtOut(amount);
    } else {
      amountOut = await contract.getChipsOut(amount);
    }
    amountOut = ethers.utils.formatUnits(amountOut, 18);
    amountOut.value = amountOut;
    priceInfo.innerText = `Price: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS fee)`;
  } catch (error) {
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
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    let tx;
    if (tokenIn.value === 'CHIPS') {
      const chipsIn = amount;
      tx = await contract.swapChipsToUsdt(amount, {
        value: chipsIn.add(fee)
      });
    } else {
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      await usdtContract.approve(DEX_ADDRESS, amount);
      tx = await contract.swapUsdtToChips(amount, { value: fee });
    }

    statusElement.innerText = `Swapping... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Swap complete! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Swap complete!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}
