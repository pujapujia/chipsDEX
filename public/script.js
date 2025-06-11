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

// Alamat lowercase (tanpa checksum)
const FEE_RECEIVER = "0x00d1cba86120485486debef7fae54132612b41b0";
const USDT_ADDRESS = "0x5a5cb08ffea579ac235e3ee34b00854e4cefcbba";
const DEX_ADDRESS = "0x3fb0be3029adc6cb52b0cc94825049fc2b9c0dd2";

console.log('Using addresses:', { FEE_RECEIVER, USDT_ADDRESS, DEX_ADDRESS });

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
    outputs: [{ internalType: "uint256", name: "uint256" }],
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
    inputs: [{ internalType: "uint256", name: amount", type: "uint256" }],
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
      { internalType: "address", name: "spender", types: "address" },
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
    statusElement.innerText = 'Error: DOM elements not found!';
    statusElement.classList.add('error');
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js not loaded!';
    statusElement.classList.add('error');
    return;
  }

  connectBtn.addEventListener('click', () => connectWallet());
  swapButton.addEventListener('click', initiateSwap);
  mintButton.addEventListener('click', initiateMint);
  burnButton.addEventListener('click', initiateBurn);
  amountIn.addEventListener('input', updatePriceEstimate));

  swapBox.style.display = 'block';

  // Polling koneksi
  setInterval(checkWalletConnection, 3000); // Lebih sering (3 detik)
});

let provider, jsonRpcProvider, signer, account;

// Inisialisasi JsonRpcProvider
jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://20.63.3.101:8545', {
  chainId: 714,
});

async function checkWalletConnection() {
  if (!provider || !window.ethereum) return;
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 714) {
      console.warn('Wrong network, switching...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2ca' }],
      });
    }
    const accounts = await provider.send('eth_accounts', []);
    if (accounts.length === 0) {
      console.warn('Wallet disconnected!');
      statusElement.innerText = 'Wallet disconnected! Please reconnect.';
      statusElement.classList.add('error');
      swapButton.disabled = true;
      mintButton.disabled = true;
      burnButton.disabled = true;
    }
  } catch (error) {
    console.error('Wallet connection check failed:', error);
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      throw new Error('Install MetaMask or Rabby Wallet!');
    }

    // Retry koneksi
    let attempts = 5;
    while (attempts > 0) {
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum, {
          chainId: 714,
          timeout: 60000,
        });

        const network = await provider.getNetwork();
        console.log('Connected to network:', network);
        if (network.chainId !== 714) {
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
        }

        const accounts = await provider.send('eth_requestAccounts', []);
        account = accounts[0];
        signer = provider.getSigner();
        statusElement.innerText = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
        statusElement.classList.add('success');
        swapButton.disabled = false;
        mintButton.disabled = false;
        burnButton.disabled = false;
        break;
      } catch (e) {
        attempts--;
        console.warn(`Connect attempt failed (${attempts} left):`, e.message);
        if (attempts === 0) throw new Error(`Failed to connect: ${e.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    console.error('Connect wallet error:', error);
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !jsonRpcProvider) return;
  try {
    console.log('Initializing DEX contract for price estimate with address:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, jsonRpcProvider);
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
    console.error('Price estimate error:', error);
  }
}

async function initiateSwap() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Initializing DEX contract for swap with address:', DEX_ADDRESS);
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
      console.log('Initializing USDT contract for swap with address:', USDT_ADDRESS);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
      if (allowance.lt(amount)) {
        const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
          gasPrice: ethers.BigNumber.from("10000000000"),
          nonce,
        });
        await approveTx.wait();
        nonce++;
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
    console.error('Swap error:', error);
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Initializing DEX contract for mint with address:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    const nonce = await provider.getTransactionCount(account, 'pending');

    const dexBalance = await jsonRpcProvider.getBalance(DEX_ADDRESS);
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
    console.error('Mint error:', error);
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Connect wallet and enter amount!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Initializing DEX contract for burn with address:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    console.log('Initializing USDT contract for burn with address:', USDT_ADDRESS);
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
      nonce++;
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
    console.error('Burn error:', error);
  }
}
