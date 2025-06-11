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
const mintButton = document.getElementById('mintButton');
const burnButton = document.getElementById('burnButton');

debugElement.innerText = 'JavaScript running...';

const CHIPS_TESTNET = {
  chainId: '714',
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.178.3.101:8545'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

const FEE_RECEIVER = "0x00d1cBA86120485486deBef7FAE54132612b41B0";
const USDT_ADDRESS = "0x5A5cb08Ffea579Ac235e3Ee34B00854e4cEfCbBA";
const DEX_ADDRESS = "0x3FB0be3029ADCecb52B0cc94825049FC2b9c0dd2";

const DEX_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "usdtAmountOut", "type": "uint256" }],
    "name": "swapChipsToUsdt",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "usdtAmountIn", "type": "uint256" }],
    "name": "swapUsdtToChips",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "chipsIn", "type": "uint256" }],
    "name": "getUsdtOut",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "usdtIn", "type": "uint256" }],
    "name": "getChipsOut",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "FEE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const USDT_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWallet');

  if (!connectBtn || !statusElement || !debugElement || !swapBox) {
    statusElement.innerText = 'Error: Page elements not found!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Error: Page elements not found!';
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js not loaded!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Error: Ethers.js not loaded!';
    return;
  }

  connectBtn.addEventListener('click', () => {
    debugElement.innerText = 'Connecting wallet...';
    connectWallet();
  });

  swapButton.addEventListener('click', () => {
    debugElement.innerText = 'Initiating swap...';
    initiateSwap();
  });

  mintButton.addEventListener('click', () => {
    debugElement.innerText = 'Initiating mint...';
    initiateMint();
  });

  burnButton.addEventListener('click', () => {
    debugElement.innerText = 'Initiating burn...';
    initiateBurn();
  });

  amountIn.addEventListener('input', updatePriceEstimate);

  debugElement.innerText = 'Setup complete!';
});

let provider, signer, account;

async function connectWallet() {
  try {
    if (!window.ethereum?.isMetaMask) {
      statusElement.innerText = 'Error: Please install MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'Error: MetaMask not found!';
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
        params: [{ chainId: '714' }]
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
    debugElement.innerText = 'Wallet connected!';
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
    let estimatedOut;
    if (tokenIn.value === 'CHIPS') {
      estimatedOut = await contract.getUsdtOut(amount);
    } else {
      estimatedOut = await contract.getChipsOut(amount);
    }
    amountOut.value = ethers.utils.formatUnits(estimatedOut, 18);
    priceInfo.innerText = `Price: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS fee)`;
  } catch (error) {
    priceInfo.innerText = `Error calculating price: ${error.message}`;
  }
}

async function initiateSwap() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Error: Missing wallet or amount!';
    return;
  }
  try {
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    let tx;
    if (tokenIn.value === 'CHIPS') {
      tx = await contract.swapChipsToUsdt(amount, {
        value: amount.add(fee),
        gasLimit: 300000
      });
    } else {
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      await usdtContract.approve(DEX_ADDRESS, amount, { gasLimit: 100000 });
      tx = await contract.swapUsdtToChips(amount, { value: fee, gasLimit: 300000 });
    }

    statusElement.innerText = `Swapping... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Swap completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Swap completed!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Error: Missing wallet or amount!';
    return;
  }
  try {
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    // Cek apakah DEX memiliki cukup CHIPS untuk mint
    const dexBalance = await provider.getBalance(DEX_ADDRESS);
    if (dexBalance.lt(amount)) {
      throw new Error("Insufficient CHIPS in DEX for minting");
    }

    // Panggil mint di kontrak USDT
    const tx = await usdtContract.mint(account, amount, { gasLimit: 200000 });

    statusElement.innerText = `Minting... (Tx: ${tx.hash})`;
    await tx.wait();

    // Kirim fee ke FEE_RECEIVER
    const feeTx = await signer.sendTransaction({
      to: FEE_RECEIVER,
      value: fee,
      gasLimit: 21000
    });
    await feeTx.wait();

    statusElement.innerText = `Mint completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Mint completed!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Error: Missing wallet or amount!';
    return;
  }
  try {
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    // Cek allowance dan approve jika diperlukan
    const allowance = await usdtContract.allowance(account, USDT_ADDRESS);
    if (allowance.lt(amount)) {
      await usdtContract.approve(USDT_ADDRESS, amount, { gasLimit: 100000 });
    }

    // Panggil burn di kontrak USDT
    const tx = await usdtContract.burn(account, amount, { gasLimit: 200000 });

    statusElement.innerText = `Burning... (Tx: ${tx.hash})`;
    await tx.wait();

    // Kirim fee ke FEE_RECEIVER
    const feeTx = await signer.sendTransaction({
      to: FEE_RECEIVER,
      value: fee,
      gasLimit: 21000
    });
    await feeTx.wait();

    statusElement.innerText = `Burn completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Burn completed!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}
