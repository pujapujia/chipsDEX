console.log('SCRIPT DIMUAT:', new Date().toISOString());

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

debugElement.innerText = 'JS berjalan...';

const CHIPS_TESTNET = {
  chainId: '714',
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.178.3.101:8545'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

const FEE_RECEIVER = "0x00d1cBA86120485486deBef7FAE54132612b41B0"; // Wallet Anda untuk menerima fee
const USDT_ADDRESS = "0x5A5cb08Ffea579Ac235e3Ee34B00854e4cEfCbBA";
const DEX_ADDRESS = "0x3FB0be3029ADCecb52B0cc94825049FC2b9c0dd2";

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
  },
  {
    "inputs": [{ "name": "to", "type": "address" }, { "name": "value", "type": "uint256" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "value", "type": "uint256" }],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWallet');

  if (!connectBtn || !statusElement || !debugElement || !swapBox) {
    statusElement.innerText = 'Error: Elemen tidak ditemukan!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Elemen tidak ditemukan!';
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js tidak ditemukan!';
    statusElement.classList.add('error');
    debugElement.innerText = 'Ethers.js tidak ditemukan!';
    return;
  }

  connectBtn.addEventListener('click', () => {
    debugElement.innerText = 'Menghubungkan...';
    connectWallet();
  });

  swapButton.addEventListener('click', () => {
    debugElement.innerText = 'Melakukan swap...';
    initiateSwap();
  });

  mintButton.addEventListener('click', () => {
    debugElement.innerText = 'Melakukan mint...';
    initiateMint();
  });

  burnButton.addEventListener('click', () => {
    debugElement.innerText = 'Melakukan burn...';
    initiateBurn();
  });

  amountIn.addEventListener('input', updatePriceEstimate);

  debugElement.innerText = 'Setup selesai!';
});

let provider, signer, account;

async function connectWallet() {
  try {
    if (!window.ethereum?.isMetaMask) {
      statusElement.innerText = 'Error: Pasang MetaMask!';
      statusElement.classList.add('error');
      debugElement.innerText = 'MetaMask tidak ditemukan!';
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
    statusElement.innerText = `Terhubung: ${account}`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Terhubung!';
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
    priceInfo.innerText = `Harga: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS fee)`;
  } catch (error) {
    priceInfo.innerText = `Error: ${error.message}`;
  }
}

async function initiateSwap() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Hubungkan wallet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    let tx;
    if (tokenIn.value === 'CHIPS') {
      tx = await contract.swapChipsToUsdt(amount, {
        value: amount.add(fee)
      });
    } else {
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      await usdtContract.approve(DEX_ADDRESS, amount);
      tx = await contract.swapUsdtToChips(amount, { value: fee });
    }

    statusElement.innerText = `Sedang swap... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Swap selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Swap selesai!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Hubungkan wallet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    const tx = await usdtContract.mint(account, amount, {
      value: amount.add(fee)
    });

    statusElement.innerText = `Sedang mint... (Tx: ${tx.hash})`;
    await tx.wait();

    // Transfer fee ke wallet Anda
    const feeTx = await signer.sendTransaction({
      to: FEE_RECEIVER,
      value: fee
    });
    await feeTx.wait();

    statusElement.innerText = `Mint selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Mint selesai!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Hubungkan wallet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");

    const tx = await usdtContract.burn(amount);

    statusElement.innerText = `Sedang burn... (Tx: ${tx.hash})`;
    await tx.wait();

    // Transfer fee ke wallet Anda
    const feeTx = await signer.sendTransaction({
      to: FEE_RECEIVER,
      value: fee
    });
    await feeTx.wait();

    statusElement.innerText = `Burn selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
    debugElement.innerText = 'Burn selesai!';
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    debugElement.innerText = `Error: ${error.message}`;
  }
}
