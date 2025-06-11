console.log('SCRIPT LOADING:', new Date().toISOString());

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

const CHIPS_TESTNET = {
  chainId: '714',
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.63.3.101:8545'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

const FEE_RECEIVER = "0x00d1cBA86120485486deBef7FAE54132612b41B0";
const USDT_ADDRESS = "0x5A5cb08FfEa579aC235E3eE34b00854E4CEfCbBA"; // Checksum diperbaiki
const DEX_ADDRESS = "0x3FB0be3029aDC6CB52b0cC94825049FC2b9c0dD2"; // Checksum diperbaiki

const DEX_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "usdtAmountOut", type: "uint256" }],
    name: "swapChipsToUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "usdtAmountIn", type: "uint256" }],
    name: "swapUsdtToChips",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "chipsIn", type: "uint256" }],
    name: "getUsdtOut",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "usdtIn", type: "uint256" }],
    name: "getChipsOut",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "mintUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burnUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const USDT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectBtn');

  if (!connectBtn || !statusElement || !swapBox) {
    statusElement.innerText = 'Error: Page elements not found!';
    statusElement.classList.add('error');
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js not loaded!';
    statusElement.classList.add('error');
    return;
  }

  connectBtn.addEventListener('click', connectWallet);
  swapButton.addEventListener('click', initiateSwap);
  mintButton.addEventListener('click', initiateMint);
  burnButton.addEventListener('click', initiateBurn);
  amountIn.addEventListener('input', updatePriceEstimate);

  swapBox.style.display = 'block';
});

let provider, signer, account;

async function connectWallet() {
  try {
    if (!window.ethereum?.isMetaMask) {
      throw new Error('Please install MetaMask!');
    }

    provider = new ethers.providers.Web3Provider(window.ethereum, {
      chainId: 714,
      timeout: 60000,
    });

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2ca' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CHIPS_TESTNET],
        });
      } else {
        throw switchError;
      }
    }

    const accounts = await provider.send('eth_requestAccounts', []);
    account = accounts[0];
    signer = provider.getSigner();
    statusElement.innerText = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
    statusElement.classList.add('success');
    swapButton.disabled = false;
    mintButton.disabled = false;
    burnButton.disabled = false;
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
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
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error calculating price: ${errorMsg}`;
    statusElement.classList.add('error');
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
    let nonce = await provider.getTransactionCount(account, 'pending');

    let tx;
    if (tokenIn.value === 'CHIPS') {
      tx = await contract.swapChipsToUsdt(amount, {
        value: amount.add(fee),
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
    } else {
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
      if (allowance.lt(amount)) {
        const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
          gasPrice: ethers.BigNumber.from("10000000000"),
          nonce,
        });
        await approveTx.wait();
        nonce++; // Increment nonce setelah approval
      }
      tx = await contract.swapUsdtToChips(amount, {
        value: fee,
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
    }

    statusElement.innerText = `Swapping... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Swap completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    return;
  }
  try {
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    const nonce = await provider.getTransactionCount(account, 'pending');

    const dexBalance = await provider.getBalance(DEX_ADDRESS);
    if (dexBalance.lt(amount)) {
      throw new Error("Insufficient CHIPS in DEX for minting");
    }

    const tx = await contract.mintUsdt(amount, {
      value: amount.add(fee),
      gasPrice: ethers.BigNumber.from("10000000000"),
      nonce,
    });

    statusElement.innerText = `Minting... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Mint completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = `Error: Connect wallet and enter amount!`;
    statusElement.classList.add('error');
    return;
  }
  try {
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    let nonce = await provider.getTransactionCount(account, 'pending');

    const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
    if (allowance.lt(amount)) {
      const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
      await approveTx.wait();
      nonce++; // Increment nonce setelah approval
    }

    const tx = await contract.burnUsdt(amount, {
      value: fee,
      gasPrice: ethers.BigNumber.from("10000000000"),
      nonce,
    });

    statusElement.innerText = `Burning... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Burn completed! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Unknown error';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
  }
}
