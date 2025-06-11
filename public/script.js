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

// Alamat raw (tanpa validasi checksum ketat)
const FEE_RECEIVER = "0x00d1cBA86120485486deBef7FAE54132612b41B0";
const USDT_ADDRESS = "0x5A5cb08FfEa579aC235E3eE34b00854E4CEfCbBA";
const DEX_ADDRESS = "0x3FB0be3029aDC6CB52b0cC94825049FC2b9c0dD2";

// Fungsi validasi alamat dengan bypass checksum
function getSafeAddress(address, name) {
  try {
    const validated = ethers.utils.getAddress(address);
    console.log(`${name} validated: ${validated}`);
    return validated;
  } catch (e) {
    console.warn(`Bypassing checksum for ${name}: ${address} due to error:`, e.message);
    return address; // Pakai alamat asli tanpa validasi
  }
}

console.log('Validating addresses...');
const safeFeeReceiver = getSafeAddress(FEE_RECEIVER, 'FEE_RECEIVER');
const safeUsdtAddress = getSafeAddress(USDT_ADDRESS, 'USDT_ADDRESS');
const safeDexAddress = getSafeAddress(DEX_ADDRESS, 'DEX_ADDRESS');

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

    // Retry logic untuk koneksi MetaMask
    let attempts = 3;
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
        break; // Berhasil konek, keluar dari loop
      } catch (e) {
        attempts--;
        console.warn(`Connect attempt failed (${attempts} left):`, e.message);
        if (attempts === 0) throw new Error(`Failed to connect after retries: ${e.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 1 detik sebelum retry
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
    console.error('Connect wallet error:', error);
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !provider) return;
  try {
    console.log('Initializing DEX contract for price estimate with address:', safeDexAddress);
    const contract = new ethers.Contract(safeDexAddress, DEX_ABI, provider);
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
    console.log('Initializing DEX contract for swap with address:', safeDexAddress);
    const contract = new ethers.Contract(safeDexAddress, DEX_ABI, signer);
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
      console.log('Initializing USDT contract for swap with address:', safeUsdtAddress);
      const usdtContract = new ethers.Contract(safeUsdtAddress, USDT_ABI, signer);
      const allowance = await usdtContract.allowance(account, safeDexAddress);
      if (allowance.lt(amount)) {
        const approveTx = await usdtContract.approve(safeDexAddress, amount, {
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
    console.log('Initializing DEX contract for mint with address:', safeDexAddress);
    const contract = new ethers.Contract(safeDexAddress, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    const nonce = await provider.getTransactionCount(account, 'pending');

    const dexBalance = await provider.getBalance(safeDexAddress);
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
    console.log('Initializing DEX contract for burn with address:', safeDexAddress);
    const contract = new ethers.Contract(safeDexAddress, DEX_ABI, signer);
    console.log('Initializing USDT contract for burn with address:', safeUsdtAddress);
    const usdtContract = new ethers.Contract(safeUsdtAddress, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    let nonce = await provider.getTransactionCount(account, 'pending');

    const allowance = await usdtContract.allowance(account, safeDexAddress);
    if (allowance.lt(amount)) {
      const approveTx = await usdtContract.approve(safeDexAddress, amount, {
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
    console.error('Burn error:', error);
  }
}
